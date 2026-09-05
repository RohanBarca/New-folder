"""
MedSync - AI Summarization Router
-----------------------------------
Provides AI patient medical history and document summarization using Groq API (LLaMA models).

Endpoints:
  POST /api/ai/final-summary          — Batch 2: Generate Final Patient Summary from ALL data
  GET  /api/patients/{id}/summary     — Retrieve the latest stored summary for a patient
  GET  /api/patients/{id}/summary/versions — List all stored summary versions for a patient
  POST /api/summarize                 — Legacy: OCR/text-based summarization (preserved)
  POST /api/groq/summarize            — Alias for legacy endpoint
  POST /api/gemini/summarize          — Alias for legacy endpoint
  GET  /api/groq/health               — Groq API connectivity health check

SECURITY:
  - API keys are managed server-side only.
  - The client receives only the generated structured medical summary.
  - patient_id is validated before any data access.
  - Cross-patient data access is structurally prevented.
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..services.groq_service import GroqService
from ..services.final_summary_service import (
    generate_and_store_summary,
    get_latest_summary,
    get_summary_versions,
    get_red_flags,
)
from ..services.patient_service import get_patient
from ..services.audit_service import log_audit_event
from ..core.security import get_current_user, UserContext

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Summarization"])


# ── Request / Response Schemas ────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    ocr_text: Optional[str] = None
    text: Optional[str] = None
    patient_records: Optional[str] = None
    medical_history: Optional[str] = None


class FinalSummaryRequest(BaseModel):
    patient_id: str


# ── Health Check ──────────────────────────────────────────────────────────────

@router.get("/api/groq/health")
@router.get("/api/summarize/health")
@router.get("/api/gemini/health")
async def groq_health():
    """
    Verifies that the backend can authenticate with the Groq API.
    Returns success status and active model.
    """
    result = await GroqService.verify_connection()
    return result


# ── Legacy OCR/Text Summarization (PRESERVED — used by MedicalRecords.jsx) ───

@router.post("/api/summarize")
@router.post("/api/groq/summarize")
@router.post("/api/gemini/summarize")
async def summarize_patient_records(body: SummarizeRequest):
    """
    Accepts medical history, current records, or OCR text from a medical document
    and returns a structured AI-generated medical summary using Groq API.

    PRESERVED for existing MedicalRecords.jsx OCR document flow.

    Body accepts:
      - ocr_text: "<extracted text>"
      - text: "<raw medical text>"
      - patient_records: "<patient records>"
      - medical_history: "<medical history>"
    """
    input_text = (
        body.ocr_text
        or body.text
        or body.patient_records
        or body.medical_history
        or ""
    ).strip()

    if not input_text:
        raise HTTPException(
            status_code=400,
            detail="Patient records or medical text is required and cannot be empty."
        )

    result = await GroqService.summarize_medical_records(input_text)

    if not result.get("success"):
        return result

    return result


# ── Batch 2: Final Patient Summary Engine ─────────────────────────────────────

@router.post("/api/ai/final-summary")
@router.post("/api/patients/{patient_id}/summary/generate")
async def generate_final_summary(
    body: Optional[FinalSummaryRequest] = None,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Final Patient Summary Engine (Batch 2).

    Collects ALL persisted patient data from PostgreSQL:
      - Patient demographics
      - Uploaded medical documents
      - OCR extracted text
      - General medical chatbot sessions & messages
      - AYUSH history (Dashavidha Pariksha & lifestyle)

    Sends normalized context to Groq and returns a structured clinical summary.
    Each call generates and stores a new versioned summary.

    Request body:
      { "patient_id": "<UUID>" }

    Response:
      {
        "success": true,
        "summary": { ...structured JSON... },
        "model": "llama-3.3-70b-versatile",
        "version": 1,
        "created_at": "...",
        "data_sources_used": ["patient_profile", "documents", "chatbot"]
      }

    SECURITY:
      - Groq API key is never returned.
      - Only data belonging to the specified patient_id is accessed.
      - No fabricated fallback content is returned on AI failure.
    """
    requested_patient_id = patient_id or (body.patient_id if body else None)
    if not requested_patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required.")

    # Validate patient_id format
    try:
        uid = uuid.UUID(str(requested_patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=403,
            detail="Access forbidden. You cannot generate summary for another patient."
        )

    # Validate patient exists (early check — full validation is in the service)
    try:
        patient = get_patient(db, str(uid))
    except SQLAlchemyError as exc:
        logger.error("DB error in final summary endpoint: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Database error while looking up patient. Please try again."
        )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient not found. Ensure the patient is registered before generating a summary."
        )

    # Generate + store summary
    result = await generate_and_store_summary(db, uid)

    if not result.get("success"):
        error_msg = result.get("error", "AI summary generation failed.")
        raise HTTPException(
            status_code=502,
            detail=error_msg
        )

    log_audit_event(
        db=db,
        actor_type="doctor",
        actor_id="ai_summarizer",
        action="ai_summary_generated",
        resource_type="final_summary",
        patient_id=uid,
        resource_id=str(result.get("id") or uid),
        details={
            "version": result.get("version"),
            "data_sources_used": result.get("data_sources_used"),
            "model": result.get("model"),
        },
    )

    return result


@router.get("/api/patients/{patient_id}/summary")
async def get_patient_summary(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Returns the most recently generated final summary for a patient.

    If no summary has been generated yet, returns 404 with a clear message
    so the frontend can prompt the doctor to generate one.

    SECURITY: patient_id validated before data access.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=403,
            detail="Access forbidden. You cannot access another patient's summary."
        )

    patient = get_patient(db, str(uid))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    try:
        summary = get_latest_summary(db, uid)
    except SQLAlchemyError as exc:
        logger.error("DB error retrieving patient summary: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Database error while retrieving summary."
        )

    if not summary:
        raise HTTPException(
            status_code=404,
            detail="No AI summary has been generated for this patient yet."
        )

    return {"success": True, "summary_record": summary}


@router.get("/api/patients/{patient_id}/summary/versions")
async def get_patient_summary_versions(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Returns metadata for all stored summary versions for a patient,
    ordered from most recent to oldest.

    SECURITY: patient_id validated before data access.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=403,
            detail="Access forbidden. You cannot access another patient's summary versions."
        )

    patient = get_patient(db, str(uid))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    try:
        versions = get_summary_versions(db, uid)
    except SQLAlchemyError as exc:
        logger.error("DB error fetching summary versions: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Database error while retrieving summary versions."
        )

    return {
        "patient_id": patient_id,
        "total_versions": len(versions),
        "versions": versions,
    }


@router.get("/api/patients/{patient_id}/red-flags")
async def get_patient_red_flags(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """Returns only source-backed red flags for the requested patient."""
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid patient_id format. Must be a valid UUID.")
    if not user.can_access_patient(uid):
        raise HTTPException(status_code=403, detail="Access forbidden. You cannot access another patient's red flags.")
    if not get_patient(db, str(uid)):
        raise HTTPException(status_code=404, detail="Patient not found.")
    return {"success": True, "patient_id": str(uid), "red_flags": get_red_flags(db, uid)}
