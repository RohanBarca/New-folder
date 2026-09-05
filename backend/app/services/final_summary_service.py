"""
MedSync — Final Summary Service (Batch 2)
------------------------------------------
Orchestrates the complete Final Patient Summary generation pipeline:

  1. Validate patient exists
  2. Collect all patient data via summary_data_service
  3. Call Groq via groq_service.generate_final_patient_summary()
  4. Validate the JSON structure
  5. Persist the summary in final_summaries table (versioned)
  6. Return the summary to the caller

Also provides:
  - get_latest_summary(db, patient_id) → most recent stored summary
  - get_summary_versions(db, patient_id) → list of all version metadata

SECURITY:
  - All operations are patient_id scoped.
  - API key is never accessed here; Groq auth is in groq_service.
  - No patient data is logged beyond type/count metadata.
"""

import uuid
import logging
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.patient import Patient
from ..models.final_summary import FinalSummary
from ..models.chat_session import ChatSession
from ..models.chat_message import ChatMessage
from ..models.document import Document
from ..models.ocr_result import OCRResult
from .summary_data_service import collect_patient_data
from .groq_service import GroqService

logger = logging.getLogger(__name__)


def detect_red_flags(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Builds flags only from explicit stored red-flag markers or urgent OCR text."""
    flags = []

    messages = (
        db.query(ChatMessage)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .filter(
            ChatSession.patient_id == patient_id,
            ChatMessage.role == "patient",
            ChatMessage.red_flag.is_(True),
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    for message in messages:
        source_reference = str(message.id)
        flags.append({
            "id": f"chat-{message.id}",
            "title": "Patient-reported concern flagged during interview",
            "severity": "high",
            "evidence": message.message_text,
            "source_type": "chatbot",
            "source_id": source_reference,
            "reference": source_reference,
            "status": "unreviewed",
            "created_at": message.created_at.isoformat() if message.created_at else None,
        })

    urgent_pattern = re.compile(r"\b(urgent|critical|emergency|life-threatening|panic value|requires urgent clinical correlation)\b", re.I)
    documents = (
        db.query(Document, OCRResult)
        .outerjoin(OCRResult, OCRResult.document_id == Document.id)
        .filter(Document.patient_id == patient_id)
        .all()
    )
    for document, ocr in documents:
        text = (ocr.extracted_text if ocr else "") or ""
        match = urgent_pattern.search(text)
        if not match:
            continue
        evidence = text[max(0, match.start() - 180):match.end() + 220].strip()
        source_reference = str(document.id)
        flags.append({
            "id": f"ocr-{document.id}",
            "title": "Urgent or critical finding explicitly documented",
            "severity": "high" if re.search(r"critical|emergency|life-threatening|panic", evidence, re.I) else "medium",
            "evidence": evidence,
            "source_type": "ocr",
            "source_id": source_reference,
            "reference": source_reference,
            "status": "unreviewed",
            "created_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
        })
    return flags


# ──────────────────────────────────────────────────────────────────────────────
# Version Counter Helper
# ──────────────────────────────────────────────────────────────────────────────

def _get_next_version(db: Session, patient_id: uuid.UUID) -> int:
    """
    Returns the next version number for a patient's summary.
    Version numbers are 1-based and auto-increment per patient.
    """
    latest = (
        db.query(FinalSummary)
        .filter(FinalSummary.patient_id == patient_id)
        .order_by(FinalSummary.generation_version.desc())
        .first()
    )
    if latest is None:
        return 1
    return (latest.generation_version or 0) + 1


# ──────────────────────────────────────────────────────────────────────────────
# Main Generation Orchestrator
# ──────────────────────────────────────────────────────────────────────────────

async def generate_and_store_summary(
    db: Session,
    patient_id: uuid.UUID,
) -> Dict[str, Any]:
    """
    Full pipeline: collect → normalize → Groq → store → return.

    Args:
        db: Active SQLAlchemy session.
        patient_id: Validated patient UUID.

    Returns:
        Dict with:
          success (bool)
          summary (dict — structured JSON)
          model (str — Groq model used)
          version (int — summary version number)
          created_at (str — ISO timestamp)
          data_sources_used (list — source types included)
          error (str — only on failure)

    Raises:
        Never raises: all errors are returned in the dict.
    """
    # ── Step 1: Validate patient ───────────────────────────────────────────
    try:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return {
                "success": False,
                "error": f"Patient not found. Cannot generate summary for unknown patient ID."
            }
    except SQLAlchemyError as exc:
        logger.error("DB error validating patient for summary: %s", type(exc).__name__)
        return {
            "success": False,
            "error": "Database error while validating patient. Please try again."
        }

    # ── Step 2: Collect all patient data ───────────────────────────────────
    try:
        normalized_context = collect_patient_data(db, patient_id)
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        logger.error("Data collection failed for summary: %s", type(exc).__name__)
        return {
            "success": False,
            "error": "Failed to collect patient data for summary generation."
        }

    data_sources = normalized_context.get("data_sources_present", ["patient_profile"])

    # ── Step 3: Generate summary via Groq ─────────────────────────────────
    groq_result = await GroqService.generate_final_patient_summary(normalized_context)

    if not groq_result.get("success"):
        return {
            "success": False,
            "error": groq_result.get("error", "AI summary generation failed.")
        }

    summary_dict = groq_result["summary"]
    model_name = groq_result.get("model", "unknown")

    # AI may organize records but may not create a clinical alert. Keep only
    # flags supported by persisted red_flag markers or explicit urgent OCR.
    red_flags = detect_red_flags(db, patient_id)
    summary_dict["red_flags"] = red_flags
    summary_dict["physician_verification_required"] = True
    summary_dict["physician_verification_status"] = "unreviewed"
    summary_dict.setdefault("surgical_history", summary_dict.get("past_surgical_history", []))
    summary_dict.setdefault("diagnoses_mentioned", summary_dict.get("diagnoses_mentioned_in_records", []))

    # Extract clinical_summary as plain text for quick display
    summary_text = summary_dict.get("clinical_summary") or ""

    # ── Step 4: Persist summary (new version row) ──────────────────────────
    try:
        version_number = _get_next_version(db, patient_id)

        summary_record = FinalSummary(
            id=uuid.uuid4(),
            patient_id=patient_id,
            summary_json=summary_dict,
            summary_text=summary_text,
            model_name=model_name,
            data_sources_used=data_sources,
            generation_version=version_number,
        )
        db.add(summary_record)
        db.commit()
        db.refresh(summary_record)

        logger.info(
            "Final summary v%s stored for patient. Model=%s Sources=%s",
            version_number, model_name, data_sources
        )

        return {
            "success": True,
            "id": str(summary_record.id),
            "summary": summary_dict,
            "model": model_name,
            "version": version_number,
            "created_at": summary_record.created_at.isoformat() if summary_record.created_at else None,
            "data_sources_used": data_sources,
        }

    except SQLAlchemyError as exc:
        logger.error("DB error storing final summary: %s", type(exc).__name__)
        # Return the generated summary even if storage fails, so the physician can still see it
        return {
            "success": True,
            "summary": summary_dict,
            "model": model_name,
            "version": None,
            "created_at": None,
            "data_sources_used": data_sources,
            "warning": "Summary generated successfully but could not be saved to database."
        }


# ──────────────────────────────────────────────────────────────────────────────
# Retrieval Functions
# ──────────────────────────────────────────────────────────────────────────────

def get_latest_summary(db: Session, patient_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Retrieves the most recently generated summary for a patient.
    Returns None if no summary exists.
    """
    record = (
        db.query(FinalSummary)
        .filter(FinalSummary.patient_id == patient_id)
        .order_by(FinalSummary.created_at.desc())
        .first()
    )
    if not record:
        return None
    return record.to_dict()


def get_summary_versions(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Returns metadata for all stored summary versions for a patient,
    ordered from most recent to oldest.
    Returns empty list if no summaries exist.
    """
    records = (
        db.query(FinalSummary)
        .filter(FinalSummary.patient_id == patient_id)
        .order_by(FinalSummary.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "version": r.generation_version,
            "model_name": r.model_name,
            "data_sources_used": r.data_sources_used,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "summary_text": r.summary_text,
        }
        for r in records
    ]


def get_red_flags(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Returns source-backed red flags from the patient's current persisted data."""
    return detect_red_flags(db, patient_id)
