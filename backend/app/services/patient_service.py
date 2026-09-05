"""
MedSync — Patient Service / Repository Layer
----------------------------------------------
Provides clean CRUD operations for the Patient model.

This layer sits between FastAPI route handlers and the SQLAlchemy ORM.
It is designed to be backend-ready for the future API contract:

  GET  /api/doctor/patients
  GET  /api/doctor/patients/{patient_id}
  PUT  /api/doctor/patients/{patient_id}
  POST /api/doctor/patients/{patient_id}/verify

All functions accept an SQLAlchemy Session and do NOT manage
session lifecycle (that is the responsibility of get_db()).

PHASE 1: Foundation only — no existing routes are modified.
"""

import uuid
from typing import Optional
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.patient import Patient


# ── Pydantic-style data classes for input ────────────────────────────────────
# Using plain dicts here to stay lightweight. Pydantic schemas will be added
# in Phase 2 when we create patient-facing registration endpoints.


def create_patient(
    db: Session,
    *,
    name: str,
    date_of_birth: Optional[date] = None,
    gender: Optional[str] = None,
    phone: Optional[str] = None,
    language: str = "en",
    abha_address: Optional[str] = None,
) -> Patient:
    """
    Inserts a new Patient record into the database.

    Returns:
        Patient: The created ORM object (with id and timestamps populated).

    Raises:
        ValueError: If name is empty.
        SQLAlchemyError: On database write failures.
    """
    if not name or not name.strip():
        raise ValueError("Patient name cannot be empty.")

    patient = Patient(
        id=uuid.uuid4(),
        name=name.strip(),
        date_of_birth=date_of_birth,
        gender=gender,
        phone=phone,
        language=language or "en",
        abha_address=abha_address,
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    """
    Retrieves a single Patient by UUID string.

    Returns:
        Patient if found, None otherwise.
    """
    try:
        uid = uuid.UUID(str(patient_id))
    except (ValueError, AttributeError):
        return None

    return db.query(Patient).filter(Patient.id == uid).first()


def get_patients(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    language: Optional[str] = None,
) -> list[Patient]:
    """
    Returns a paginated list of patients.

    Args:
        skip: Number of records to skip (for pagination).
        limit: Maximum records to return (capped at 100).
        language: Optional filter by intake language code ('en', 'hi', ...).

    Returns:
        List of Patient ORM objects ordered by created_at descending.
    """
    limit = min(limit, 100)  # Hard cap to prevent large unintended queries
    query = db.query(Patient)

    if language:
        query = query.filter(Patient.language == language)

    return query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()


def update_patient(
    db: Session,
    patient_id: str,
    *,
    name: Optional[str] = None,
    date_of_birth: Optional[date] = None,
    gender: Optional[str] = None,
    phone: Optional[str] = None,
    language: Optional[str] = None,
) -> Optional[Patient]:
    """
    Partially updates an existing Patient record.
    Only fields explicitly provided (non-None) are updated.

    Returns:
        Updated Patient object, or None if patient not found.
    """
    patient = get_patient(db, patient_id)
    if not patient:
        return None

    if name is not None:
        patient.name = name.strip()
    if date_of_birth is not None:
        patient.date_of_birth = date_of_birth
    if gender is not None:
        patient.gender = gender
    if phone is not None:
        patient.phone = phone
    if language is not None:
        patient.language = language

    patient.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(patient)
    return patient


def count_patients(db: Session) -> int:
    """Returns the total number of patient records in the database."""
    return db.query(Patient).count()
