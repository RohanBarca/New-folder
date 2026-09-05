"""
MedSync — Consent Management Service
--------------------------------------
Manages patient consent lifecycle for DPDP and ABDM compliance:
  - Grants, revokes, and inspects consent records.
  - Granular consent types:
      - data_collection: basic demographic & profile collection
      - medical_history: recording past conditions & history
      - document_processing: uploading and storing medical documents
      - ai_processing: sending data to Groq for summarization & intake
      - abdm_sharing: linking/sharing records with ABDM/HIU
      - doctor_access: allowing attending physician review
      - voice_processing: audio transcription & speech synthesis
  - Non-destructive revocation: preserves audit trail with timestamp.
  - Reusable `has_consent` function for non-blocking compliance checks.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.patient import Patient
from ..models.consent import Consent
from .audit_service import log_audit_event

logger = logging.getLogger(__name__)

# Standard recognized consent types and default purpose descriptions
VALID_CONSENT_TYPES = {
    "data_collection": "Collection and storage of patient profile and demographic information",
    "medical_history": "Collection and storage of patient clinical and AYUSH history",
    "document_processing": "Storage and OCR processing of uploaded medical records",
    "ai_processing": "AI-assisted clinical intake interview and record summarization",
    "abdm_sharing": "Integration with Ayushman Bharat Digital Mission (ABDM) health records",
    "doctor_access": "Access to clinical records by authorized attending healthcare professionals",
    "voice_processing": "Speech-to-text transcription and text-to-speech audio synthesis",
}

VALID_STATUSES = {"granted", "revoked", "pending"}


def create_or_update_consent(
    db: Session,
    patient_id: uuid.UUID,
    consent_type: str,
    status: str = "granted",
    purpose: Optional[str] = None,
    actor_type: str = "patient",
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Grants, updates, or creates a consent record for a patient.
    
    If an existing consent of this type exists, it creates a new versioned entry
    or updates the existing state to maintain a full history.
    """
    consent_type = consent_type.strip().lower()
    if consent_type not in VALID_CONSENT_TYPES:
        raise ValueError(
            f"Invalid consent_type '{consent_type}'. Must be one of: {', '.join(sorted(VALID_CONSENT_TYPES.keys()))}."
        )

    status = status.strip().lower()
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}.")

    # Validate patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ValueError(f"Patient with ID '{patient_id}' does not exist.")

    now = datetime.now(timezone.utc)
    purpose_desc = purpose or VALID_CONSENT_TYPES.get(consent_type, "Clinical data processing")

    # Check for existing consent record of this type
    existing = (
        db.query(Consent)
        .filter(Consent.patient_id == patient_id, Consent.consent_type == consent_type)
        .order_by(Consent.version.desc())
        .first()
    )

    next_version = (existing.version + 1) if existing else 1

    consent_record = Consent(
        id=uuid.uuid4(),
        patient_id=patient_id,
        consent_type=consent_type,
        purpose=purpose_desc,
        status=status,
        granted_at=now if status == "granted" else None,
        revoked_at=now if status == "revoked" else None,
        version=next_version,
    )

    db.add(consent_record)
    db.commit()
    db.refresh(consent_record)

    # Log audit event
    action = f"consent_{status}"
    log_audit_event(
        db=db,
        actor_type=actor_type,
        actor_id=actor_id or str(patient_id),
        action=action,
        resource_type="consent",
        patient_id=patient_id,
        resource_id=str(consent_record.id),
        details={
            "consent_type": consent_type,
            "status": status,
            "version": next_version,
            "purpose": purpose_desc,
        }
    )

    return consent_record.to_dict()


def get_patient_consents(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Returns all active/historical consent records for a patient.
    """
    records = (
        db.query(Consent)
        .filter(Consent.patient_id == patient_id)
        .order_by(Consent.created_at.desc())
        .all()
    )
    return [r.to_dict() for r in records]


def revoke_consent(
    db: Session,
    patient_id: uuid.UUID,
    consent_id: uuid.UUID,
    actor_type: str = "patient",
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Revokes a specific consent record.
    Preserves the record for audit compliance and sets revoked_at timestamp.
    """
    record = (
        db.query(Consent)
        .filter(Consent.id == consent_id, Consent.patient_id == patient_id)
        .first()
    )

    if not record:
        raise ValueError(f"Consent record '{consent_id}' not found for patient '{patient_id}'.")

    now = datetime.now(timezone.utc)
    record.status = "revoked"
    record.revoked_at = now
    record.updated_at = now

    db.commit()
    db.refresh(record)

    # Log audit event
    log_audit_event(
        db=db,
        actor_type=actor_type,
        actor_id=actor_id or str(patient_id),
        action="consent_revoked",
        resource_type="consent",
        patient_id=patient_id,
        resource_id=str(record.id),
        details={
            "consent_type": record.consent_type,
            "revoked_at": now.isoformat(),
        }
    )

    return record.to_dict()


def has_consent(
    arg1: Any,
    arg2: Any,
    arg3: Optional[str] = None,
    db: Optional[Session] = None,
) -> Tuple[bool, str]:
    """
    Flexible helper function that checks if a patient has an active granted consent.

    Supports both parameter orderings:
      - has_consent(patient_id, consent_type, db=db)
      - has_consent(db, patient_id, consent_type)

    Returns:
        Tuple[bool, str]:
          (True, "GRANTED")       if actively granted
          (False, "REVOKED")      if explicitly revoked
          (False, "NOT PROVIDED") if no consent record exists or status is pending
    """
    actual_db: Optional[Session] = db
    target_patient_id: Optional[uuid.UUID] = None
    target_consent_type: Optional[str] = None

    if isinstance(arg1, Session):
        actual_db = arg1
        target_patient_id = arg2 if isinstance(arg2, uuid.UUID) else uuid.UUID(str(arg2))
        target_consent_type = str(arg3) if arg3 else ""
    else:
        target_patient_id = arg1 if isinstance(arg1, uuid.UUID) else uuid.UUID(str(arg1))
        target_consent_type = str(arg2)
        if isinstance(arg3, Session):
            actual_db = arg3

    target_consent_type = target_consent_type.strip().lower()

    if not actual_db:
        # If DB session is not passed, attempt to fetch a session from database sessionmaker
        from ..database import SessionLocal
        if SessionLocal is not None:
            temp_db = SessionLocal()
            try:
                return _query_consent_status(temp_db, target_patient_id, target_consent_type)
            finally:
                temp_db.close()
        return False, "NOT PROVIDED"

    return _query_consent_status(actual_db, target_patient_id, target_consent_type)


def _query_consent_status(
    session: Session,
    patient_id: uuid.UUID,
    consent_type: str,
) -> Tuple[bool, str]:
    """Internal query helper for consent status."""
    record = (
        session.query(Consent)
        .filter(Consent.patient_id == patient_id, Consent.consent_type == consent_type)
        .order_by(Consent.version.desc())
        .first()
    )

    if not record:
        return False, "NOT PROVIDED"

    if record.status == "granted":
        return True, "GRANTED"
    elif record.status == "revoked":
        return False, "REVOKED"
    else:
        return False, "NOT PROVIDED"

