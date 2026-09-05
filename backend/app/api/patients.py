"""
MedSync — Patients API Router
--------------------------------
Endpoints:
  POST /api/patients            — Create a new patient record in PostgreSQL
  GET  /api/patients            — List patients (for doctor dashboard future use)
  GET  /api/patients/{id}       — Get a single patient by UUID

Security:
  - Database credentials are never exposed in responses
  - Stack traces are never returned to the client
  - All validation is performed before database operations

Phase 2: Connects the existing registration form to PostgreSQL/Supabase.
"""

import re
import uuid
import logging
from pathlib import Path
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..config import SUPPORTED_LANGUAGES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB
from ..services.patient_service import (
    create_patient,
    get_patient,
    get_patients,
    count_patients,
    update_patient,
)
from ..services.document_service import (
    create_patient_document_with_ocr,
    get_patient_documents,
)
from ..services.chat_history_service import (
    get_patient_chat_sessions,
    get_patient_ayush_history,
)
from ..services.audit_service import log_audit_event
from ..core.security import get_current_user, UserContext

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patients", tags=["Patients"])

# ── Valid gender values matching the frontend dropdown ──────────────────────
VALID_GENDERS = {"Male", "Female", "Other", "Prefer not to say"}


# ── Request / Response Schemas ──────────────────────────────────────────────

class PatientCreateRequest(BaseModel):
    """Payload accepted from the frontend registration form."""

    name: str
    date_of_birth: Optional[str] = None   # ISO date string: "YYYY-MM-DD"
    gender: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = "en"

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name is required and cannot be blank.")
        if len(v) > 255:
            raise ValueError("name must be 255 characters or fewer.")
        return v

    @field_validator("gender")
    @classmethod
    def gender_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and v not in VALID_GENDERS:
            raise ValueError(
                f"gender must be one of: {', '.join(sorted(VALID_GENDERS))}."
            )
        return v or None

    @field_validator("phone")
    @classmethod
    def phone_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        # Allow digits, spaces, hyphens, +, parentheses — between 7 and 15 digits
        digits_only = re.sub(r"[\s\-\+\(\)]", "", v)
        if not digits_only.isdigit() or not (7 <= len(digits_only) <= 15):
            raise ValueError(
                "phone must be a valid phone number (7–15 digits, with optional +, spaces, or hyphens)."
            )
        return v

    @field_validator("language")
    @classmethod
    def language_must_be_supported(cls, v: Optional[str]) -> str:
        if not v:
            return "en"
        v = v.strip().lower()
        if v not in SUPPORTED_LANGUAGES:
            return "en"   # Gracefully fall back, not a hard error
        return v

    @field_validator("date_of_birth")
    @classmethod
    def dob_must_be_valid(cls, v: Optional[str]) -> Optional[date]:
        """Convert ISO string to date and reject future dates."""
        if not v:
            return None
        try:
            parsed = date.fromisoformat(v.strip())
        except ValueError:
            raise ValueError(
                "date_of_birth must be in YYYY-MM-DD format (e.g. 1990-06-15)."
            )
        if parsed > date.today():
            raise ValueError("date_of_birth cannot be in the future.")
        return parsed


class PatientCreateResponse(BaseModel):
    """Returned to the frontend after successful patient creation."""
    id: str
    name: str
    message: str
    language: str


class PatientDetailsUpdateRequest(BaseModel):
    """Basic details saved after mobile OTP creates the patient identity."""

    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    language: Optional[str] = "en"

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name is required and cannot be blank.")
        if len(v) > 255:
            raise ValueError("name must be 255 characters or fewer.")
        return v

    @field_validator("gender")
    @classmethod
    def gender_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and v not in VALID_GENDERS:
            raise ValueError(f"gender must be one of: {', '.join(sorted(VALID_GENDERS))}.")
        return v or None

    @field_validator("date_of_birth")
    @classmethod
    def dob_must_be_valid(cls, v: Optional[str]) -> Optional[date]:
        if not v:
            return None
        try:
            parsed = date.fromisoformat(v.strip())
        except ValueError:
            raise ValueError("date_of_birth must be in YYYY-MM-DD format (e.g. 1990-06-15).")
        if parsed > date.today():
            raise ValueError("date_of_birth cannot be in the future.")
        return parsed

    @field_validator("language")
    @classmethod
    def language_must_be_supported(cls, v: Optional[str]) -> str:
        value = v.strip().lower() if v else "en"
        return value if value in SUPPORTED_LANGUAGES else "en"


class PatientResponse(BaseModel):
    """Returned for GET single / list endpoints."""
    id: str
    name: str
    date_of_birth: Optional[str]
    gender: Optional[str]
    phone: Optional[str]
    language: Optional[str]
    abha_status: str
    created_at: Optional[str]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", response_model=PatientCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_record(
    body: PatientCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new patient record in PostgreSQL.

    Accepts registration form data from the frontend.
    Returns the database-generated UUID patient ID.
    Never exposes stack traces or database credentials.
    """
    try:
        patient = create_patient(
            db,
            name=body.name,
            date_of_birth=body.date_of_birth,
            gender=body.gender,
            phone=body.phone,
            language=body.language or "en",
        )
        logger.info("Patient record created. ID=[REDACTED] Language=%s", patient.language)
        log_audit_event(
            db=db,
            actor_type="patient",
            actor_id=str(patient.id),
            action="patient_registered",
            resource_type="patient",
            patient_id=patient.id,
            resource_id=str(patient.id),
            details={"language": patient.language or "en"},
        )
        return PatientCreateResponse(
            id=str(patient.id),
            name=patient.name,
            message="Patient created successfully",
            language=patient.language or "en",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except SQLAlchemyError as exc:
        err_type = type(exc).__name__
        logger.error("Database error creating patient: %s", err_type)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration failed due to a database error. Please try again.",
        )
    except RuntimeError as exc:
        logger.error("Database not configured: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not available. Please contact support.",
        )


@router.put("/{patient_id}", response_model=dict)
async def update_patient_details(
    patient_id: str,
    body: PatientDetailsUpdateRequest,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """Save registration details only for the patient linked to the JWT."""
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid patient_id format.")

    if not user.is_authenticated or not user.is_patient() or user.patient_id != uid:
        raise HTTPException(status_code=403, detail="You can only update your own patient profile.")

    try:
        patient = update_patient(
            db,
            str(uid),
            name=body.name,
            date_of_birth=body.date_of_birth,
            gender=body.gender,
            language=body.language,
        )
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Unable to save patient details.")

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return patient.to_dict()


@router.get("", response_model=dict)
async def list_patients(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    language: Optional[str] = Query(None, description="Filter by language code"),
    db: Session = Depends(get_db),
):
    """
    List patients — for future Doctor Dashboard integration.
    Returns paginated records ordered by most recent first.
    """
    try:
        patients = get_patients(db, skip=skip, limit=limit, language=language)
        total = count_patients(db)
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "patients": [p.to_dict() for p in patients],
        }
    except SQLAlchemyError as exc:
        logger.error("Database error listing patients: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve patient list.",
        )


@router.get("/{patient_id}", response_model=dict)
async def get_patient_record(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Get a single patient by UUID.
    For future Doctor Dashboard integration.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot access another patient's data."
        )

    try:
        patient = get_patient(db, str(uid))
    except SQLAlchemyError as exc:
        logger.error("Database error fetching patient: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve patient record.",
        )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    return patient.to_dict()


# ── Document Management Endpoints (Phase 3) ──────────────────────────────────

@router.post("/{patient_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_patient_document(
    patient_id: str,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form("Medical Document"),
    db: Session = Depends(get_db),
):
    """
    Upload an OPD / medical document for a specific patient.
    
    Flow:
      1. Validate patient exists in PostgreSQL (rejects invalid/missing patient).
      2. Validate uploaded file format and size.
      3. Persist document metadata in `documents` table.
      4. Run OCR text extraction via existing OCRService (OCR.space).
      5. Persist extracted text and stats in `ocr_results` table.
      6. Return unified document and OCR result.
    """
    # 1. Validate patient_id format
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    # 2. Validate patient exists in database
    patient = get_patient(db, str(uid))
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' does not exist. Please register first."
        )

    # 3. Validate file presence
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded. Please select a valid medical document."
        )

    # 4. Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file_ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )

    # 5. Read and validate file content & size
    try:
        content = await file.read()
    except Exception as exc:
        logger.error("Error reading uploaded document: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read the uploaded file. Please try again."
        )

    file_size = len(content)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please select a valid document."
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        mb_size = round(file_size / (1024 * 1024), 2)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({mb_size} MB) exceeds maximum allowed limit of {MAX_FILE_SIZE_MB} MB."
        )

    # 6. Process document storage & OCR extraction
    try:
        result = await create_patient_document_with_ocr(
            db=db,
            patient_id=uid,
            filename=file.filename,
            file_bytes=content,
            file_type=file.content_type or file_ext,
            document_type=document_type or "Medical Document",
        )
        log_audit_event(
            db=db,
            actor_type="patient",
            actor_id=str(uid),
            action="document_uploaded",
            resource_type="document",
            patient_id=uid,
            resource_id=str(result.get("document_id")),
            details={
                "filename": file.filename,
                "document_type": document_type,
                "ocr_status": result.get("ocr_status"),
            },
        )
        log_audit_event(
            db=db,
            actor_type="system",
            actor_id="ocr_engine",
            action="ocr_processed",
            resource_type="ocr_result",
            patient_id=uid,
            resource_id=str(result.get("document_id")),
            details={
                "ocr_status": result.get("ocr_status"),
                "ocr_engine": result.get("ocr_engine"),
                "processing_time_ms": result.get("processing_time_ms"),
            },
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except SQLAlchemyError as exc:
        logger.error("Database error saving document: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to save document record due to database error."
        )


@router.get("/{patient_id}/documents")
async def list_patient_documents(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Retrieve all medical documents and OCR extraction history for a patient.
    Used by the OPD reader and the Doctor Dashboard.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot access another patient's data."
        )

    patient = get_patient(db, str(uid))
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )

    try:
        docs = get_patient_documents(db, uid)
        return docs
    except SQLAlchemyError as exc:
        logger.error("Database error fetching patient documents: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve patient documents."
        )


@router.get("/{patient_id}/chat-sessions")
async def list_patient_chat_sessions(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Retrieve all AI chatbot interview sessions for a patient.
    Used by the clinical history viewer and Doctor Dashboard.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot access another patient's data."
        )

    patient = get_patient(db, str(uid))
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )

    try:
        sessions = get_patient_chat_sessions(db, uid)
        return sessions
    except SQLAlchemyError as exc:
        logger.error("Database error fetching patient chat sessions: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve chat sessions."
        )


@router.get("/{patient_id}/ayush-history")
async def get_patient_ayush(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Retrieve the patient's stored AYUSH history (Dashavidha Pariksha & Lifestyle).
    Returns a clean empty/null response if no AYUSH history exists.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )

    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot access another patient's data."
        )

    patient = get_patient(db, str(uid))
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )

    try:
        history = get_patient_ayush_history(db, uid)
        return {"ayush_history": history}
    except SQLAlchemyError as exc:
        logger.error("Database error fetching patient AYUSH history: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve AYUSH history."
        )


