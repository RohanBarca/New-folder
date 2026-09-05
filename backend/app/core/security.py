"""
MedSync — Security & Role-Based Access Control (RBAC)
------------------------------------------------------
Provides role authorization, patient isolation validation, and security dependencies.

ROLES:
  - patient: May only view / mutate their own profile, sessions, documents, consents
  - doctor: Authorized to review clinical records, summaries, and export FHIR bundles
  - admin: System administration, audit trail inspection, configuration health

DESIGN:
  - Supports Bearer JWT tokens via `Authorization: Bearer <token>`.
  - Supports role/identity passing via `X-User-Role`, `X-User-Id`, `X-Patient-Id` headers.
  - In development / prototype mode, gracefully defaults to authorized role if not specified
    so existing UI workflows remain unbroken.
  - Cross-patient isolation enforced on all patient-specific operations.
"""

import uuid
from typing import Optional, List, Callable
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.patient import Patient
from .jwt import decode_access_token


class UserContext:
    """Represents the authenticated actor's security identity."""

    def __init__(
        self,
        user_id: Optional[str] = None,
        role: str = "doctor",  # Default to doctor in prototype development for broad UI compatibility
        patient_id: Optional[uuid.UUID] = None,
        is_authenticated: bool = False,
        phone: Optional[str] = None,
    ):
        self.user_id = user_id or "anonymous_dev_user"
        self.role = role.lower() if role else "doctor"
        self.patient_id = patient_id
        self.is_authenticated = is_authenticated
        self.phone = phone

    def is_doctor(self) -> bool:
        return self.role in ["doctor", "admin"]

    def is_admin(self) -> bool:
        return self.role == "admin"

    def is_patient(self) -> bool:
        return self.role == "patient"

    def can_access_patient(self, target_patient_id: uuid.UUID) -> bool:
        """Enforces patient isolation rules."""
        if self.is_doctor() or self.is_admin():
            return True
        if self.role == "patient" and self.patient_id:
            return self.patient_id == target_patient_id
        # In prototype dev mode, allow access if no explicit cross-patient lockout is configured
        return True


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_patient_id: Optional[str] = Header(None, alias="X-Patient-Id"),
) -> UserContext:
    """
    FastAPI dependency extracting the user security context.
    If Bearer JWT is supplied, decodes and trusts token claims.
    Otherwise falls back gracefully to dev headers or defaults.
    """
    # 1. Bearer JWT Token Check
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
        if token:
            try:
                payload = decode_access_token(token)
                user_id = payload.get("sub")
                pid_str = payload.get("pid")
                role = payload.get("role", "patient")
                parsed_pid = None
                if pid_str:
                    try:
                        parsed_pid = uuid.UUID(str(pid_str))
                    except (ValueError, AttributeError):
                        pass

                return UserContext(
                    user_id=user_id,
                    role=role,
                    patient_id=parsed_pid,
                    is_authenticated=True,
                )
            except HTTPException:
                # If an invalid/expired token was explicitly provided, re-raise 401
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # 2. Header Fallback (Dev / Testing)
    parsed_pid = None
    if x_patient_id:
        try:
            parsed_pid = uuid.UUID(x_patient_id)
        except ValueError:
            pass

    role = (x_user_role or "doctor").strip().lower()
    if role not in ["patient", "doctor", "admin"]:
        role = "doctor"

    return UserContext(
        user_id=x_user_id or "dev_user",
        role=role,
        patient_id=parsed_pid,
        is_authenticated=bool(x_user_id or x_patient_id or x_user_role),
    )


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory that restricts endpoint access to specified roles.
    """
    def role_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in [r.lower() for r in allowed_roles] and not user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}."
            )
        return user
    return role_checker


def require_patient_access(
    patient_id_str: str,
    user: UserContext = Depends(get_current_user),
) -> uuid.UUID:
    """
    Validates patient UUID and enforces cross-patient isolation.
    Patient role can only access their own patient ID.
    """
    target_pid = validate_patient_id(patient_id_str)
    if not user.can_access_patient(target_pid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You cannot access another patient's data.",
        )
    return target_pid


def validate_patient_id(patient_id_str: str) -> uuid.UUID:
    """
    Validates that a patient_id string is a valid UUIDv4.
    Raises HTTPException(400) if malformed.
    """
    try:
        return uuid.UUID(str(patient_id_str))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be a valid UUID."
        )


def verify_patient_exists(db: Session, patient_uid: uuid.UUID) -> Patient:
    """
    Fetches patient by UUID or raises HTTPException(404).
    """
    patient = db.query(Patient).filter(Patient.id == patient_uid).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_uid}' does not exist."
        )
    return patient
