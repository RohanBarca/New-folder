"""
MedSync - AI Chatbot Router with PostgreSQL Persistence (Batch 1)
-------------------------------------------------------------------
Endpoints:
  - POST  /api/chat/start                       : Initializes a new ChatSession linked to a patient
  - POST  /api/chat/message                     : Processes a patient response, saves turns to PostgreSQL, returns next question
  - GET   /api/chat/session/{session_id}        : Returns session state summary (with DB hydration)
  - GET   /api/chat/sessions/{session_id}/messages : Returns complete chronological conversation history
  - PATCH /api/chat/session/{session_id}/language : Updates session language in DB mid-conversation (no restart)
"""

import uuid
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..models.patient import Patient
from ..models.chat_message import ChatMessage
from ..services.chat_service import ChatService, session_store
from ..services.chat_history_service import (
    create_chat_session,
    get_chat_session as get_db_chat_session,
    update_chat_session_mode,
    update_chat_session_language as update_db_session_language,
    complete_chat_session,
    add_chat_message,
    record_ayush_parameter_answer,
    get_session_messages,
)
from ..services.audit_service import log_audit_event
from ..config import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, detect_text_language, normalize_language_code

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])


class ChatStartRequest(BaseModel):
    patient_id: Optional[str] = None      # UUID of the registered patient (Required)
    mode: Optional[str] = "general"       # "general" | "ayush"
    language: Optional[str] = "en"        # BCP-47 code: "en" | "hi" | future languages
    session_id: Optional[str] = None      # Optional: existing session ID for mode-switch
    patient_details: Optional[Dict[str, Any]] = None
    patient_context: Optional[Dict[str, Any]] = None  # alias for patient_details/context
    form_data: Optional[Dict[str, Any]] = None
    ocr_text: Optional[str] = None
    ai_summary: Optional[Dict[str, Any]] = None


class ChatMessageRequest(BaseModel):
    session_id: str
    message: str
    patient_id: Optional[str] = None      # Optional patient verification
    language: Optional[str] = None        # Optional: switch language mid-conversation


class LanguageUpdateRequest(BaseModel):
    language: str                          # BCP-47 code e.g. "hi"
    patient_id: Optional[str] = None      # Optional verification


@router.post("/start")
async def start_chat_session(body: ChatStartRequest, db: Session = Depends(get_db)):
    """
    Initializes a new conversational health history interview session or switches mode to AYUSH.
    Requires a valid patient_id (must exist in PostgreSQL).
    Persists ChatSession and initial ChatMessage in PostgreSQL.
    """
    # 1. Extract patient_id from body or nested context
    raw_patient_id = (
        body.patient_id
        or (body.patient_context and body.patient_context.get("patient_id"))
        or (body.patient_details and body.patient_details.get("patient_id"))
        or (body.patient_details and body.patient_details.get("id"))
    )

    if not raw_patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="patient_id is required to start a chat session. Please complete patient registration first."
        )

    # 2. Validate patient_id UUID format
    try:
        pat_uid = uuid.UUID(str(raw_patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    # 3. Verify patient exists in database
    patient = db.query(Patient).filter(Patient.id == pat_uid).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{raw_patient_id}' does not exist."
        )

    # 4. Mode and language validation
    mode = body.mode or "general"
    language = normalize_language_code(body.language or patient.language or DEFAULT_LANGUAGE)

    # 5. Handle existing session (e.g. switching mode to AYUSH or continuing) vs new session
    if body.session_id:
        try:
            sess_uid = uuid.UUID(str(body.session_id))
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session_id format. Must be a valid UUID."
            )

        db_session = get_db_chat_session(db, sess_uid)
        if not db_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat session '{body.session_id}' not found."
            )

        # Security check: verify patient ownership!
        if str(db_session.patient_id) != str(pat_uid):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot access another patient's chat session."
            )

        # Update mode and language in PostgreSQL
        update_chat_session_mode(db, sess_uid, mode=mode, language=language)
    else:
        # Create brand new session in PostgreSQL
        sess_uid = uuid.uuid4()
        create_chat_session(
            db=db,
            patient_id=pat_uid,
            session_id=sess_uid,
            mode=mode,
            language=language,
        )

    # 6. Call Groq service to generate initial question
    context = body.model_dump()
    context["session_id"] = str(sess_uid)
    context["patient_id"] = str(pat_uid)
    context["mode"] = mode
    context["language"] = language

    # Enrich context with patient data if missing
    if not context.get("patient_details"):
        context["patient_details"] = patient.to_dict()

    result = await ChatService.start_chat(context)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to start AI health interview session.")
        )

    # 7. Persist initial assistant question to PostgreSQL chat_messages
    init_question = result.get("question")
    if init_question:
        try:
            add_chat_message(
                db=db,
                session_id=sess_uid,
                role="assistant",
                message_text=init_question,
                section=result.get("section", "Chief Complaint" if mode != "ayush" else "AYUSH History"),
                question_number=result.get("question_number", 1),
                ayush_parameter=result.get("ayush_parameter"),
                red_flag=result.get("red_flag", False),
            )
        except Exception as exc:
            logger.error("Failed to persist initial assistant question to DB: %s", type(exc).__name__)

    # Ensure patient_id is included in the response
    result["patient_id"] = str(pat_uid)

    log_audit_event(
        db=db,
        actor_type="patient",
        actor_id=str(pat_uid),
        action="chat_session_created",
        resource_type="chat_session",
        patient_id=pat_uid,
        resource_id=str(sess_uid),
        details={"mode": mode, "language": language},
    )

    return result


@router.post("/message")
async def send_chat_message(body: ChatMessageRequest, db: Session = Depends(get_db)):
    """
    Processes a patient's answer in an active session and returns the next adaptive question.
    Persists every turn (patient answer & AI response) to PostgreSQL.
    """
    if not body.session_id or not body.session_id.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session_id is required.")

    if not body.message or not body.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="message cannot be empty.")

    # 1. Validate session_id format
    try:
        sess_uid = uuid.UUID(body.session_id.strip())
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format.")

    # 2. Look up session in database
    db_session = get_db_chat_session(db, sess_uid)
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{body.session_id}' not found."
        )

    # 3. Security check: ownership verification if patient_id is provided
    if body.patient_id:
        try:
            req_pat_uid = uuid.UUID(str(body.patient_id))
            if str(db_session.patient_id) != str(req_pat_uid):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You cannot access another patient's chat session."
                )
        except (ValueError, AttributeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patient_id format.")

    # 4. Apply an explicit voice language or practical Indic-script detection for typed text.
    detected_language = normalize_language_code(body.language) if body.language else detect_text_language(body.message)
    if detected_language:
        update_db_session_language(db, sess_uid, detected_language)
        session_store.update_language(str(sess_uid), detected_language)

    # 5. Get in-memory session (or hydrated from DB)
    session = session_store.get_session(str(sess_uid))
    current_section = session.get("current_section") if session else "HPI"
    current_ayush_param = session.get("current_ayush_parameter") if session else None
    current_q_num = session.get("question_number", 1) if session else 1

    # 6. Persist patient turn to PostgreSQL chat_messages table
    try:
        add_chat_message(
            db=db,
            session_id=sess_uid,
            role="patient",
            message_text=body.message.strip(),
            section=current_section,
            question_number=current_q_num,
            ayush_parameter=current_ayush_param,
            red_flag=False,
        )
    except Exception as exc:
        logger.error("Failed to persist patient message to DB: %s", type(exc).__name__)

    # 7. If in AYUSH mode and parameter active, persist answer into ayush_histories table
    if db_session.mode == "ayush" and current_ayush_param:
        try:
            record_ayush_parameter_answer(
                db=db,
                patient_id=db_session.patient_id,
                session_id=sess_uid,
                parameter_name=current_ayush_param,
                patient_answer=body.message.strip(),
            )
        except Exception as exc:
            logger.error("Failed to record AYUSH parameter answer: %s", type(exc).__name__)

    # 8. Call existing Groq conversation service
    result = await ChatService.send_message(
        str(sess_uid),
        body.message.strip(),
        language=detected_language
    )

    if not result.get("success"):
        return result

    # Keep the persistent alert attached to the patient's triggering answer,
    # rather than copying the session's sticky alert onto every later prompt.
    if result.get("new_red_flag"):
        patient_turn = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.session_id == sess_uid,
                ChatMessage.role == "patient",
            )
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        if patient_turn:
            patient_turn.red_flag = True
            db.commit()

    # 9. Persist assistant response turn to PostgreSQL chat_messages table
    is_complete = bool(result.get("complete", False))
    ai_text = result.get("question") or result.get("message") or "History collection complete."
    next_section = result.get("section", "Complete" if is_complete else current_section)
    next_ayush_param = result.get("ayush_parameter")
    next_q_num = result.get("question_number", current_q_num + 1)
    red_flag = bool(result.get("new_red_flag", False))

    try:
        add_chat_message(
            db=db,
            session_id=sess_uid,
            role="assistant",
            message_text=ai_text,
            section=next_section,
            question_number=next_q_num,
            ayush_parameter=next_ayush_param,
            red_flag=red_flag,
        )

        # 10. If conversation complete, update ChatSession status and completed_at in DB
        if is_complete:
            complete_chat_session(db, sess_uid)

    except Exception as exc:
        logger.error("Failed to persist assistant response to DB: %s", type(exc).__name__)

    result["patient_id"] = str(db_session.patient_id)
    return result


@router.get("/sessions/{session_id}/messages")
async def get_chat_session_messages(
    session_id: str,
    patient_id: Optional[str] = Query(None, description="Optional patient ID to verify ownership"),
    db: Session = Depends(get_db),
):
    """
    Returns the complete chronological conversation history for a given session.
    Retrieves records directly from the PostgreSQL chat_messages table.
    """
    try:
        sess_uid = uuid.UUID(str(session_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format.")

    db_session = get_db_chat_session(db, sess_uid)
    if not db_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")

    if patient_id:
        try:
            req_pat_uid = uuid.UUID(str(patient_id))
            if str(db_session.patient_id) != str(req_pat_uid):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You cannot access another patient's chat session."
                )
        except (ValueError, AttributeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patient_id format.")

    try:
        messages = get_session_messages(db, sess_uid)
        return messages
    except SQLAlchemyError as exc:
        logger.error("Database error retrieving session messages: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve chat messages."
        )


@router.get("/session/{session_id}")
async def get_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Returns stored session state for a given session_id (includes language field and DB hydration)."""
    session = session_store.get_session(session_id)
    if not session:
        # Check DB
        try:
            sess_uid = uuid.UUID(str(session_id))
            db_session = get_db_chat_session(db, sess_uid)
            if not db_session:
                raise HTTPException(status_code=404, detail="Session not found.")
            session = session_store.get_session(session_id)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid session_id format.")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return {
        "success": True,
        "session_id": session_id,
        "patient_id": session.get("patient_id"),
        "mode": session.get("mode", "general"),
        "language": session.get("current_language", session.get("language", DEFAULT_LANGUAGE)),
        "current_language": session.get("current_language", session.get("language", DEFAULT_LANGUAGE)),
        "current_section": session.get("current_section"),
        "current_ayush_parameter": session.get("current_ayush_parameter"),
        "ayush_history": session.get("ayush_history"),
        "question_number": session.get("question_number"),
        "complete": session.get("complete"),
        "red_flag": session.get("red_flag"),
        "qna_count": len(session.get("questions_answers", [])),
        "questions_answers": session.get("questions_answers", [])
    }


@router.patch("/session/{session_id}/language")
async def update_session_language(
    session_id: str,
    body: LanguageUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Updates the language of an active session mid-conversation.
    Persists updated language to PostgreSQL and in-memory session.
    Preserves all collected history, Q&A pairs, clinical sections, and AYUSH data.
    """
    normalized_language = normalize_language_code(body.language)
    if normalized_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{body.language}'. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
        )

    try:
        sess_uid = uuid.UUID(str(session_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid session_id format.")

    db_session = get_db_chat_session(db, sess_uid)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if body.patient_id and str(db_session.patient_id) != str(body.patient_id):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's chat session.")

    # Update in database
    update_db_session_language(db, sess_uid, normalized_language)

    # Update in memory
    session_store.update_language(session_id, normalized_language)

    return {
        "success": True,
        "session_id": session_id,
        "language": normalized_language,
        "current_language": normalized_language,
        "language_name": SUPPORTED_LANGUAGES[normalized_language],
        "message": f"Session language updated to {SUPPORTED_LANGUAGES[normalized_language]}. Previous history preserved."
    }
