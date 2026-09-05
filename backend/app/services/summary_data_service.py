"""
MedSync — Summary Data Collection & Normalization Service
----------------------------------------------------------
Batch 2: Final AI Summary Engine — Data Layer

Responsibilities:
  1. Collect ALL persisted data for a given patient_id from PostgreSQL.
  2. Normalize it into a structured context dict ready for Groq.
  3. Enforce patient isolation — NEVER mix data across patients.
  4. Handle missing data gracefully; never invent values.
  5. Safely truncate extremely long OCR texts while preserving clinical
     context and source document references.

Data Sources Collected:
  - patient_profile   : Patient demographics and registration details
  - documents         : Uploaded medical document metadata
  - ocr               : OCR-extracted text from documents
  - chatbot           : Patient-reported clinical history from AI interview
  - ayush_history     : Dashavidha Pariksha & lifestyle responses

SECURITY:
  - All queries are filtered by patient_id (UUID).
  - Cross-patient leakage is structurally impossible via FK constraints.
  - No API keys, passwords, or storage paths are included in the context.
"""

import uuid
import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from ..models.patient import Patient
from ..models.document import Document
from ..models.ocr_result import OCRResult
from ..models.chat_session import ChatSession
from ..models.chat_message import ChatMessage
from ..models.ayush_history import AyushHistory

logger = logging.getLogger(__name__)

# Maximum characters to include per OCR document before safe truncation
_MAX_OCR_CHARS_PER_DOC = 5000
# Maximum total OCR chars across all documents
_MAX_TOTAL_OCR_CHARS = 15000


# ──────────────────────────────────────────────────────────────────────────────
# Age Calculation Helper
# ──────────────────────────────────────────────────────────────────────────────

def _calculate_age(date_of_birth: Optional[date]) -> Optional[int]:
    """Calculates patient age from date_of_birth. Returns None if unavailable."""
    if not date_of_birth:
        return None
    today = date.today()
    age = today.year - date_of_birth.year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        age -= 1
    return age


# ──────────────────────────────────────────────────────────────────────────────
# OCR Safe Truncation
# ──────────────────────────────────────────────────────────────────────────────

def _safe_truncate_ocr(text: str, max_chars: int, filename: str) -> str:
    """
    Safely truncates OCR text that exceeds max_chars.
    Appends a clear truncation notice so the model knows content was cut.
    Preserves the beginning of the document which typically has the most
    clinically relevant header information.
    """
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    # Try to break at a sentence/newline boundary
    last_break = max(
        truncated.rfind("\n"),
        truncated.rfind(". "),
        truncated.rfind(", ")
    )
    if last_break > max_chars // 2:
        truncated = truncated[:last_break]
    return (
        f"{truncated}\n"
        f"[OCR TRUNCATED: Document '{filename}' contained more text "
        f"({len(text)} chars total) but was safely truncated to preserve "
        f"model context limits. The full text is stored in the database.]"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Patient Profile Collection
# ──────────────────────────────────────────────────────────────────────────────

def _collect_patient_profile(patient: Patient) -> Dict[str, Any]:
    """Extracts safe demographic information from the Patient record."""
    age = _calculate_age(patient.date_of_birth)
    return {
        "name": patient.name or "Not provided",
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "age": age,
        "gender": patient.gender or "Not provided",
        "phone": patient.phone or "Not provided",
        "language": patient.language or "en",
        "abha_address": patient.abha_address or None,
        "registered_at": patient.created_at.isoformat() if patient.created_at else None,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Documents & OCR Collection
# ──────────────────────────────────────────────────────────────────────────────

def _collect_documents(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Fetches all documents and their OCR results for the patient.
    Strips storage_path (filesystem path) — not needed in AI context.
    Applies safe OCR truncation.
    """
    docs = (
        db.query(Document)
        .options(joinedload(Document.ocr_result))
        .filter(Document.patient_id == patient_id)
        .order_by(Document.uploaded_at.asc())
        .all()
    )

    collected = []
    total_ocr_chars = 0

    for doc in docs:
        ocr_text = None
        ocr_status = "not_attempted"
        ocr_uncertain = False

        if doc.ocr_result:
            raw_ocr = (doc.ocr_result.extracted_text or "").strip()
            ocr_status = doc.ocr_result.ocr_status or "unknown"

            if ocr_status == "failed":
                ocr_text = None
                ocr_uncertain = True
            elif ocr_status == "empty":
                ocr_text = ""
                ocr_uncertain = False
            elif raw_ocr:
                # Apply per-document truncation
                remaining_budget = _MAX_TOTAL_OCR_CHARS - total_ocr_chars
                per_doc_limit = min(_MAX_OCR_CHARS_PER_DOC, remaining_budget)

                if per_doc_limit <= 0:
                    ocr_text = (
                        f"[OCR OMITTED: Total OCR budget ({_MAX_TOTAL_OCR_CHARS} chars) "
                        f"reached. Full text for '{doc.original_filename}' is in the database.]"
                    )
                else:
                    ocr_text = _safe_truncate_ocr(raw_ocr, per_doc_limit, doc.original_filename)
                    total_ocr_chars += len(raw_ocr)
            else:
                ocr_text = ""

        collected.append({
            "document_id": str(doc.id),
            "filename": doc.original_filename,
            "document_type": doc.document_type or "Medical Document",
            "file_type": doc.file_type,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "ocr_status": ocr_status,
            "ocr_text": ocr_text,
            "ocr_uncertain": ocr_uncertain,
        })

    return collected


# ──────────────────────────────────────────────────────────────────────────────
# Chat Session & Message Collection
# ──────────────────────────────────────────────────────────────────────────────

def _collect_chat_history(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Fetches all chat sessions and their messages for the patient.
    Only includes patient-role messages (answers) plus section/red_flag metadata.
    Separates general vs AYUSH sessions.
    """
    sessions = (
        db.query(ChatSession)
        .options(joinedload(ChatSession.messages))
        .filter(ChatSession.patient_id == patient_id)
        .order_by(ChatSession.created_at.asc())
        .all()
    )

    collected = []
    for session in sessions:
        messages = sorted(session.messages, key=lambda m: m.created_at or datetime.min)

        # Collect patient answers with clinical metadata
        conversation_turns = []
        red_flags_in_session = []

        for msg in messages:
            if msg.role == "patient" and msg.message_text and msg.message_text.strip():
                turn = {
                    "message_id": str(msg.id),
                    "role": "patient",
                    "text": msg.message_text.strip(),
                    "section": msg.section,
                    "ayush_parameter": msg.ayush_parameter,
                    "red_flag": msg.red_flag,
                }
                conversation_turns.append(turn)
                if msg.red_flag:
                    red_flags_in_session.append(msg.message_text.strip())
            elif msg.role == "assistant" and msg.message_text and msg.message_text.strip():
                # Include assistant questions for context
                turn = {
                    "message_id": str(msg.id),
                    "role": "assistant",
                    "text": msg.message_text.strip(),
                    "section": msg.section,
                    "ayush_parameter": msg.ayush_parameter,
                }
                conversation_turns.append(turn)

        if conversation_turns:  # Only include sessions that have messages
            collected.append({
                "session_id": str(session.id),
                "mode": session.mode,
                "language": session.language,
                "status": session.status,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
                "turns": conversation_turns,
                "red_flags_detected": red_flags_in_session,
            })

    return collected


# ──────────────────────────────────────────────────────────────────────────────
# AYUSH History Collection
# ──────────────────────────────────────────────────────────────────────────────

def _collect_ayush_history(db: Session, patient_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Fetches the latest AYUSH history for the patient.
    Returns None if no history exists — never fabricates values.
    """
    record = (
        db.query(AyushHistory)
        .filter(AyushHistory.patient_id == patient_id)
        .order_by(AyushHistory.updated_at.desc())
        .first()
    )

    if not record:
        return None

    return {
        "collected_at": record.updated_at.isoformat() if record.updated_at else None,
        # Dashavidha Pariksha parameters (patient-reported)
        "prakriti": record.prakriti,
        "vikriti": record.vikriti,
        "sara": record.sara,
        "samhanana": record.samhanana,
        "pramana": record.pramana,
        "satmya": record.satmya,
        "sattva": record.sattva,
        "ahara_shakti": record.ahara_shakti,
        "vyayama_shakti": record.vyayama_shakti,
        "vaya": record.vaya,
        # Lifestyle & etiology (patient-reported)
        "ahara": record.ahara,
        "vihara": record.vihara,
        "nidana": record.nidana,
        "samprapti": record.samprapti,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Main Collection Orchestrator
# ──────────────────────────────────────────────────────────────────────────────

def collect_patient_data(db: Session, patient_id: uuid.UUID) -> Dict[str, Any]:
    """
    Collects and normalizes ALL persisted information for a patient into a
    structured context dict suitable for the Groq summary prompt.

    Args:
        db: Active SQLAlchemy session.
        patient_id: Validated patient UUID.

    Returns:
        Normalized context dict with keys:
          patient, documents, chat_sessions, ayush_history, data_sources_present

    Raises:
        ValueError: If patient_id does not exist.
    """
    # 1. Verify patient exists (security: reject unknown IDs early)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ValueError(f"Patient with ID '{patient_id}' not found.")

    # 2. Collect each data source independently (failures in one do not block others)
    patient_profile = _collect_patient_profile(patient)

    documents = []
    try:
        documents = _collect_documents(db, patient_id)
    except Exception as exc:
        logger.warning("Could not collect documents for patient [REDACTED]: %s", type(exc).__name__)

    chat_sessions = []
    try:
        chat_sessions = _collect_chat_history(db, patient_id)
    except Exception as exc:
        logger.warning("Could not collect chat history for patient [REDACTED]: %s", type(exc).__name__)

    ayush_history = None
    try:
        ayush_history = _collect_ayush_history(db, patient_id)
    except Exception as exc:
        logger.warning("Could not collect AYUSH history for patient [REDACTED]: %s", type(exc).__name__)

    # 3. Record which data sources contributed
    data_sources_present = ["patient_profile"]
    if documents:
        data_sources_present.append("documents")
        if any(d.get("ocr_text") for d in documents):
            data_sources_present.append("ocr")
    if chat_sessions:
        data_sources_present.append("chatbot")
    if ayush_history:
        data_sources_present.append("ayush_history")

    # 4. Return normalized context
    return {
        "patient": patient_profile,
        "documents": documents,
        "chat_sessions": chat_sessions,
        "ayush_history": ayush_history,
        "data_sources_present": data_sources_present,
        "collection_note": (
            "All information collected from patient records in MedSync PostgreSQL database. "
            "No data has been fabricated or inferred outside the stored records."
        ),
    }
