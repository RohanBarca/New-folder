"""
MedSync — ABDM API Router
---------------------------
Endpoints:
  GET  /api/abdm/status           — ABDM readiness and sandbox status
  POST /api/abdm/verify-abha      — ABHA verification dispatch
  POST /api/abdm/discover-records — ABDM health record discovery
  POST /api/abdm/consent-request  — ABDM consent artefact request
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.abdm_service import ABDMService
from ..services.audit_service import log_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/abdm", tags=["ABDM Gateway Integration"])


class AbhaVerifyRequest(BaseModel):
    abha_identifier: str
    auth_mode: Optional[str] = "MOBILE_OTP"
    otp: Optional[str] = None
    txn_id: Optional[str] = None


class AbdmRecordDiscoveryRequest(BaseModel):
    patient_identifier: str
    hip_id: str


class AbdmConsentRequest(BaseModel):
    patient_abha_address: str
    hi_types: Optional[List[str]] = ["Prescription", "DiagnosticReport", "OPConsultation"]
    date_range_from: str
    date_range_to: str


class AbdmShareRequest(BaseModel):
    patient_id: str
    target_hip: Optional[str] = None


@router.get("/status")
async def get_abdm_status():
    """
    Returns the current readiness and configuration status of ABDM integration.
    """
    return ABDMService.get_status()


@router.post("/verify-abha")
@router.post("/verify", tags=["ABHA Gateway Integration"])
async def verify_abha_endpoint(
    body: AbhaVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    ABDM M1 ABHA Verification Endpoint.
    Returns clear not_configured status if ABDM is disabled in configuration.
    """
    result = await ABDMService.verify_abha(
        abha_identifier=body.abha_identifier,
        auth_mode=body.auth_mode or "MOBILE_OTP",
        otp=body.otp,
        txn_id=body.txn_id,
    )

    log_audit_event(
        db=db,
        actor_type="patient",
        action="abdm_abha_verification_attempted",
        resource_type="abdm",
        details={
            "status": result.get("status"),
            "success": result.get("success", False),
        }
    )

    return result


@router.post("/discover-records")
@router.get("/health-records")
async def discover_records_endpoint(
    body: Optional[AbdmRecordDiscoveryRequest] = None,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    ABDM M3 Health Record Discovery Endpoint.
    """
    pid = body.patient_identifier if body else (patient_id or "patient_id")
    hip = body.hip_id if body else "default_hip"
    return await ABDMService.discover_records(
        patient_identifier=pid,
        hip_id=hip,
    )


@router.post("/consent-request")
@router.post("/consent")
async def request_consent_endpoint(
    body: AbdmConsentRequest,
    db: Session = Depends(get_db),
):
    """
    ABDM M2 Consent Artefact Dispatch Endpoint.
    """
    return await ABDMService.request_consent(
        patient_abha_address=body.patient_abha_address,
        hi_types=body.hi_types or ["OPConsultation"],
        date_range_from=body.date_range_from,
        date_range_to=body.date_range_to,
    )


@router.post("/share")
async def share_records_endpoint(
    body: AbdmShareRequest,
    db: Session = Depends(get_db),
):
    """
    ABDM Record Sharing Endpoint.
    Enforces patient consent for 'abdm_sharing'.
    """
    return await ABDMService.share_records(
        db=db,
        patient_id=body.patient_id,
        target_hip=body.target_hip,
    )
