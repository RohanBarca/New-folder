"""
MedSync — Authentication API Router
-------------------------------------
Endpoints for Mobile Number SMS OTP Authentication via MSG91.

Endpoints:
  - POST /api/auth/mobile/send-otp   : Dispatches real SMS OTP via MSG91
  - POST /api/auth/mobile/verify-otp : Verifies OTP, resolves/creates UserAccount + Patient, issues JWT
  - GET  /api/auth/me                : Returns authenticated user identity & linked patient
  - POST /api/auth/logout            : Clears session & logs audit event

SECURITY:
  - Never logs or exposes OTPs.
  - Never exposes MSG91 credentials.
  - Enforces resend cooldown and maximum verification attempts.
  - Identity rule: ONE verified phone → ONE UserAccount → ONE patient_id.
  - Emits immutable audit logs for auth events.
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user_account import UserAccount
from ..models.patient import Patient
from ..core.security import get_current_user, UserContext
from ..core.jwt import create_access_token
from ..services.otp_service import get_otp_provider, MSG91OTPProvider
from ..services.auth_service import (
    normalize_phone,
    strip_plus,
    check_resend_cooldown,
    record_otp_sent,
    record_verify_attempt,
    clear_otp_state,
    get_or_create_user_account,
    get_user_by_phone,
    update_last_login,
)
from ..services.audit_service import log_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone_input(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Phone number cannot be empty.")
        return clean


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    request_id: Optional[str] = None


class VerifyWidgetRequest(BaseModel):
    access_token: str

    @field_validator("access_token")
    @classmethod
    def validate_access_token(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Access token cannot be empty.")
        return clean


class MobileLoginRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone_input(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Phone number cannot be empty.")
        return clean


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/mobile/widget-config")
async def get_mobile_widget_config():
    provider = get_otp_provider()
    if not isinstance(provider, MSG91OTPProvider) or not provider.widget_config():
        raise HTTPException(status_code=503, detail="OTP widget is not configured.")
    return provider.widget_config()


@router.post("/mobile/verify-widget")
async def verify_mobile_widget(payload: VerifyWidgetRequest, db: Session = Depends(get_db)):
    provider = get_otp_provider()
    if not isinstance(provider, MSG91OTPProvider):
        raise HTTPException(status_code=503, detail="OTP widget is not configured.")
    verified_phone = await provider.verify_access_token(payload.access_token)
    canonical_phone = normalize_phone(verified_phone or "")
    if not canonical_phone:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP verification.")
    user_account, patient, is_new = get_or_create_user_account(db, canonical_phone)
    if not is_new:
        update_last_login(db, user_account)
    token = create_access_token(user_account_id=str(user_account.id), patient_id=str(patient.id), role=user_account.role)
    return {"success": True, "authenticated": True, "access_token": token, "token_type": "bearer", "user": {
        "id": str(user_account.id), "role": user_account.role, "patient_id": str(patient.id),
        "patient_name": patient.name, "phone_masked": f"+91****{canonical_phone[-4:]}",
        "phone_verified": True, "is_new_patient": is_new,
    }}

@router.post(
    "/mobile/send-otp",
    summary="Send SMS OTP to Indian Mobile Number",
    description="Dispatches a real SMS OTP via MSG91. Enforces rate limits and resend cooldown.",
)
async def send_mobile_otp(
    payload: SendOtpRequest,
    db: Session = Depends(get_db),
):
    # 1. Normalize phone to canonical +91XXXXXXXXXX
    canonical_phone = normalize_phone(payload.phone)
    if not canonical_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Indian mobile number. Please provide a valid 10-digit mobile number.",
        )

    # 2. Check resend cooldown
    can_send, cooldown_remaining = check_resend_cooldown(canonical_phone)
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {cooldown_remaining} seconds before requesting a new OTP.",
        )

    # 3. Dispatch OTP via active provider (MSG91 / Mock)
    provider = get_otp_provider()
    # Strip '+' prefix for MSG91 API (expects '91XXXXXXXXXX')
    msg91_format = strip_plus(canonical_phone)
    otp_res = await provider.send_otp(phone=msg91_format)

    if not otp_res.success:
        log_audit_event(
            db=db,
            actor_type="patient",
            action="otp_send_failed",
            resource_type="auth",
            details={"phone_masked": f"+91****{canonical_phone[-4:]}", "reason": otp_res.error},
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=otp_res.error or "Failed to dispatch SMS OTP. Please check your number or try again later.",
        )

    # 4. Record state for cooldown & attempt tracking
    req_id = otp_res.request_id or str(uuid.uuid4())
    record_otp_sent(canonical_phone, req_id)

    # 5. Audit Log
    log_audit_event(
        db=db,
        actor_type="patient",
        action="otp_dispatched",
        resource_type="auth",
        details={"phone_masked": f"+91****{canonical_phone[-4:]}"},
    )

    return {
        "success": True,
        "message": "OTP sent successfully to your mobile number.",
        "request_id": req_id,
        "phone_masked": f"+91****{canonical_phone[-4:]}",
    }


@router.post(
    "/mobile/verify-otp",
    summary="Verify SMS OTP & Authenticate Session",
    description="Verifies the OTP via MSG91, resolves/creates UserAccount and Patient, and issues a secure JWT access token.",
)
async def verify_mobile_otp(
    payload: VerifyOtpRequest,
    db: Session = Depends(get_db),
):
    # 1. Normalize phone
    canonical_phone = normalize_phone(payload.phone)
    if not canonical_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mobile number format.",
        )

    # 2. Check max attempts
    allowed, attempts_remaining = record_verify_attempt(canonical_phone)
    if not allowed:
        log_audit_event(
            db=db,
            actor_type="patient",
            action="otp_max_attempts_exceeded",
            resource_type="auth",
            details={"phone_masked": f"+91****{canonical_phone[-4:]}"},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum verification attempts exceeded. Please request a new OTP.",
        )

    # 3. Verify OTP via Provider
    provider = get_otp_provider()
    msg91_format = strip_plus(canonical_phone)
    verify_res = await provider.verify_otp(
        phone=msg91_format,
        otp=payload.otp,
        req_id=payload.request_id or "",
    )

    if not verify_res.success:
        log_audit_event(
            db=db,
            actor_type="patient",
            action="otp_verification_failed",
            resource_type="auth",
            details={"phone_masked": f"+91****{canonical_phone[-4:]}", "attempts_remaining": attempts_remaining},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=verify_res.error or "Invalid OTP. Please check the code and try again.",
        )

    # 4. Success — Clear OTP attempt rate-limit state
    clear_otp_state(canonical_phone)

    # 5. Core Identity Rule: ONE verified phone → ONE UserAccount → ONE patient_id
    user_account, patient, is_new = get_or_create_user_account(db, canonical_phone)
    if not is_new:
        update_last_login(db, user_account)

    # 6. Issue secure JWT Access Token
    token = create_access_token(
        user_account_id=str(user_account.id),
        patient_id=str(patient.id),
        role=user_account.role,
    )

    # 7. Audit Log
    log_audit_event(
        db=db,
        actor_type="patient",
        actor_id=str(user_account.id),
        action="user_registered_mobile" if is_new else "user_login_mobile",
        resource_type="user_account",
        resource_id=str(user_account.id),
        patient_id=patient.id,
        details={
            "phone_masked": f"+91****{canonical_phone[-4:]}",
            "is_new_account": is_new,
            "auth_provider": "mobile_otp",
        },
    )

    return {
        "success": True,
        "authenticated": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user_account.id),
            "role": user_account.role,
            "patient_id": str(patient.id),
            "patient_name": patient.name,
            "phone_masked": f"+91****{canonical_phone[-4:]}",
            "phone_verified": True,
            "is_new_patient": is_new,
        },
    }


@router.post(
    "/mobile/login",
    summary="Login or register with phone number only",
    description="Uses the mobile number as the unique patient identifier and creates or retrieves the patient without any OTP or verification step.",
)
async def login_with_phone_number(
    payload: MobileLoginRequest,
    db: Session = Depends(get_db),
):
    canonical_phone = normalize_phone(payload.phone)
    if not canonical_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Indian mobile number. Please provide a valid 10-digit phone number.",
        )

    user_account, patient, is_new = get_or_create_user_account(db, canonical_phone)
    if not is_new:
        update_last_login(db, user_account)

    token = create_access_token(
        user_account_id=str(user_account.id),
        patient_id=str(patient.id),
        role=user_account.role,
    )

    log_audit_event(
        db=db,
        actor_type="patient",
        actor_id=str(user_account.id),
        action="user_registered_mobile" if is_new else "user_login_mobile",
        resource_type="user_account",
        resource_id=str(user_account.id),
        patient_id=patient.id,
        details={
            "phone_masked": f"+91****{canonical_phone[-4:]}",
            "is_new_account": is_new,
            "auth_provider": "mobile_number_only",
        },
    )

    return {
        "success": True,
        "authenticated": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user_account.id),
            "role": user_account.role,
            "patient_id": str(patient.id),
            "patient_name": patient.name,
            "phone_masked": f"+91****{canonical_phone[-4:]}",
            "phone_verified": True,
            "is_new_patient": is_new,
        },
    }


@router.get(
    "/me",
    summary="Get Authenticated User Profile",
    description="Returns identity and linked patient info for the active authenticated session.",
)
async def get_current_user_profile(
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.patient_id and user.user_id == "anonymous_dev_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    account = None
    try:
        acc_uid = uuid.UUID(str(user.user_id))
        account = db.query(UserAccount).filter(UserAccount.id == acc_uid).first()
    except (ValueError, AttributeError):
        pass

    patient = None
    if user.patient_id:
        patient = db.query(Patient).filter(Patient.id == user.patient_id).first()

    return {
        "authenticated": True,
        "user_id": user.user_id,
        "role": user.role,
        "patient_id": str(user.patient_id) if user.patient_id else None,
        "phone_masked": account.safe_dict().get("phone_masked") if account else None,
        "patient": patient.to_dict() if patient else None,
    }


@router.post(
    "/logout",
    summary="Logout Current Session",
    description="Logs out the current session and records an audit event.",
)
async def logout_user(
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log_audit_event(
        db=db,
        actor_type=user.role,
        actor_id=user.user_id,
        action="user_logout",
        resource_type="auth",
        patient_id=user.patient_id,
    )
    return {
        "success": True,
        "message": "Successfully logged out.",
    }
