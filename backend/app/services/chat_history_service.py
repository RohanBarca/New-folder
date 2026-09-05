"""
MedSync — Chat History & AYUSH Persistence Service
----------------------------------------------------
Handles database operations for:
  - ChatSession creation, state tracking, and completion
  - Chronological ChatMessage persistence (both assistant & patient turns)
  - AYUSH History parameter tracking (Dashavidha Pariksha & Lifestyle)

Architecture:
  Patient
    └── ChatSessions (1 to N)
          ├── ChatMessages (chronological turns)
          └── AyushHistory (1 to 1 per session/patient)
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.patient import Patient
from ..models.chat_session import ChatSession
from ..models.chat_message import ChatMessage
from ..models.ayush_history import AyushHistory

logger = logging.getLogger(__name__)

# Mapping from question AYUSH parameter names to AyushHistory column names
AYUSH_PARAM_MAP = {
    "prakriti": "prakriti",
    "vikriti": "vikriti",
    "sara": "sara",
    "samhanana": "samhanana",
    "pramana": "pramana",
    "satmya": "satmya",
    "sattva": "sattva",
    "ahara shakti": "ahara_shakti",
    "aharashakti": "ahara_shakti",
    "ahara_shakti": "ahara_shakti",
    "agni": "ahara_shakti",
    "vyayama shakti": "vyayama_shakti",
    "vyayamashakti": "vyayama_shakti",
    "vyayama_shakti": "vyayama_shakti",
    "vaya": "vaya",
    "ahara": "ahara",
    "vihara": "vihara",
    "nidana": "nidana",
    "samprapti": "samprapti",
}


def create_chat_session(
    db: Session,
    patient_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    mode: str = "general",
    language: str = "en",
) -> ChatSession:
    """
    Creates and persists a new ChatSession for a patient in PostgreSQL.
    Raises ValueError if patient does not exist.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ValueError(f"Patient with ID '{patient_id}' does not exist.")

    sid = session_id or uuid.uuid4()
    session = ChatSession(
        id=sid,
        patient_id=patient_id,
        mode=mode or "general",
        language=language or "en",
        status="active",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)

    # If starting directly in AYUSH mode, initialize the AyushHistory record
    if mode == "ayush":
        ayush_rec = AyushHistory(
            id=uuid.uuid4(),
            patient_id=patient_id,
            session_id=sid,
        )
        db.add(ayush_rec)

    db.commit()
    db.refresh(session)
    return session


def get_chat_session(db: Session, session_id: uuid.UUID) -> Optional[ChatSession]:
    """Retrieves a ChatSession by its UUID."""
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def update_chat_session_mode(
    db: Session,
    session_id: uuid.UUID,
    mode: str,
    language: Optional[str] = None,
) -> Optional[ChatSession]:
    """
    Updates mode (e.g. general -> ayush) and optional language on an existing session.
    Also ensures an AyushHistory record exists when transitioning to AYUSH mode.
    """
    session = get_chat_session(db, session_id)
    if not session:
        return None

    session.mode = mode
    if language:
        session.language = language
    session.updated_at = datetime.now(timezone.utc)

    if mode == "ayush":
        existing_ayush = db.query(AyushHistory).filter(AyushHistory.session_id == session_id).first()
        if not existing_ayush:
            ayush_rec = AyushHistory(
                id=uuid.uuid4(),
                patient_id=session.patient_id,
                session_id=session_id,
            )
            db.add(ayush_rec)

    db.commit()
    db.refresh(session)
    return session


def update_chat_session_language(
    db: Session,
    session_id: uuid.UUID,
    language: str,
) -> Optional[ChatSession]:
    """Updates session language mid-conversation without affecting collected history."""
    session = get_chat_session(db, session_id)
    if not session:
        return None

    session.language = language
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def complete_chat_session(db: Session, session_id: uuid.UUID) -> Optional[ChatSession]:
    """Marks a session as completed with a timestamp."""
    session = get_chat_session(db, session_id)
    if not session:
        return None

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def add_chat_message(
    db: Session,
    session_id: uuid.UUID,
    role: str,
    message_text: str,
    section: Optional[str] = None,
    question_number: Optional[int] = None,
    ayush_parameter: Optional[str] = None,
    red_flag: bool = False,
) -> ChatMessage:
    """
    Persists a single conversational turn in the chat_messages table.
    """
    msg = ChatMessage(
        id=uuid.uuid4(),
        session_id=session_id,
        role=role,
        message_text=message_text,
        section=section,
        question_number=question_number,
        ayush_parameter=ayush_parameter,
        red_flag=red_flag,
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def record_ayush_parameter_answer(
    db: Session,
    patient_id: uuid.UUID,
    session_id: uuid.UUID,
    parameter_name: str,
    patient_answer: str,
) -> Optional[AyushHistory]:
    """
    Maps and persists the patient's answer for a specific AYUSH parameter
    into the AyushHistory record in PostgreSQL.
    """
    if not parameter_name:
        return None

    normalized_key = parameter_name.strip().lower()
    column_name = AYUSH_PARAM_MAP.get(normalized_key)
    if not column_name:
        # Check direct attribute match
        safe_attr = normalized_key.replace(" ", "_")
        if hasattr(AyushHistory, safe_attr):
            column_name = safe_attr

    if not column_name:
        return None

    # Find or create AyushHistory for this session
    ayush_record = db.query(AyushHistory).filter(AyushHistory.session_id == session_id).first()
    if not ayush_record:
        ayush_record = db.query(AyushHistory).filter(AyushHistory.patient_id == patient_id).first()

    if not ayush_record:
        ayush_record = AyushHistory(
            id=uuid.uuid4(),
            patient_id=patient_id,
            session_id=session_id,
        )
        db.add(ayush_record)

    setattr(ayush_record, column_name, patient_answer)
    ayush_record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ayush_record)
    return ayush_record


def get_patient_chat_sessions(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Retrieves all chat sessions for a patient."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.patient_id == patient_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    return [s.to_dict() for s in sessions]


def get_session_messages(db: Session, session_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Retrieves all messages for a session in chronological order."""
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        {
            "role": m.role,
            "message_text": m.message_text,
            "section": m.section,
            "question_number": m.question_number,
            "ayush_parameter": m.ayush_parameter,
            "red_flag": m.red_flag,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in msgs
    ]


def get_patient_ayush_history(db: Session, patient_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Retrieves the latest AYUSH history for a patient.
    Returns clean dictionary or None if no history exists.
    """
    record = (
        db.query(AyushHistory)
        .filter(AyushHistory.patient_id == patient_id)
        .order_by(AyushHistory.updated_at.desc())
        .first()
    )
    if not record:
        return None
    return record.to_dict()
