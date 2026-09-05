"""
MedSync — Consent API Router
------------------------------
Endpoints:
  POST /api/patients/{patient_id}/consents                  — Create/grant/update consent
  GET  /api/patients/{patient_id}/consents                  — List all patient consents
  POST /api/patients/{patient_id}/consents/{consent_id}/revoke — Revoke a specific consent
  GET  /api/patients/{patient_id}/consents/check/{consent_type} — Verify active consent status
"""

import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.consent_service import (
    create_or_update_consent,
    get_patient_consents,
    revoke_consent,
    has_consent,
    VALID_CONSENT_TYPES,
    VALID_STATUSES,
)
from ..core.security import validate_patient_id, verify_patient_exists, get_current_user, UserContext

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patients/{patient_id}/consents", tags=["Consent Management"])


class ConsentCreateRequest(BaseModel):
    consent_type: str
    purpose: Optional[str] = None
    status: Optional[str] = "granted"

    @field_validator("consent_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in VALID_CONSENT_TYPES:
            raise ValueError(
                f"consent_type must be one of: {', '.join(sorted(VALID_CONSENT_TYPES.keys()))}."
            )
        return v_clean

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> str:
        if not v:
            return "granted"
        v_clean = v.strip().lower()
        if v_clean not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}.")
        return v_clean


@router.post("", status_code=status.HTTP_201_CREATED)
async def grant_patient_consent(
    patient_id: str,
    body: ConsentCreateRequest,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Grants or registers a patient consent record in PostgreSQL.
    """
    uid = validate_patient_id(patient_id)
    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot modify another patient's consent."
        )
    verify_patient_exists(db, uid)

    try:
        record = create_or_update_consent(
            db=db,
            patient_id=uid,
            consent_type=body.consent_type,
            status=body.status or "granted",
            purpose=body.purpose,
        )
        return {
            "success": True,
            "message": f"Consent for '{body.consent_type}' successfully updated to '{body.status}'.",
            "consent": record,
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error("DB error recording consent: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to record consent due to database error."
        )


@router.get("")
async def list_patient_consents(
    patient_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Lists all consent records (active and revoked) for a patient.
    """
    uid = validate_patient_id(patient_id)
    if not user.can_access_patient(uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot view another patient's consent."
        )
    verify_patient_exists(db, uid)

    consents = get_patient_consents(db, uid)
    return {
        "patient_id": str(uid),
        "total": len(consents),
        "consents": consents,
    }


@router.post("/{consent_id}/revoke")
async def revoke_patient_consent(
    patient_id: str,
    consent_id: str,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Revokes a specific consent record non-destructively.
    Records the revocation timestamp and preserves the audit trail.
    """
    p_uid = validate_patient_id(patient_id)
    c_uid = validate_patient_id(consent_id)
    if not user.can_access_patient(p_uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot revoke another patient's consent."
        )
    verify_patient_exists(db, p_uid)

    try:
        updated = revoke_consent(db=db, patient_id=p_uid, consent_id=c_uid)
        return {
            "success": True,
            "message": f"Consent '{updated['consent_type']}' has been revoked.",
            "consent": updated,
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("DB error revoking consent: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to revoke consent."
        )


@router.get("/check/{consent_type}")
async def check_patient_consent_status(
    patient_id: str,
    consent_type: str,
    db: Session = Depends(get_db),
):
    """
    Inspects whether a patient has an active granted consent for a specific operation.
    Returns granted, revoked, or not_provided.
    """
    p_uid = validate_patient_id(patient_id)
    verify_patient_exists(db, p_uid)

    granted, status_str = has_consent(db, p_uid, consent_type)
    return {
        "patient_id": str(p_uid),
        "consent_type": consent_type,
        "is_granted": granted,
        "status": status_str,
    }
