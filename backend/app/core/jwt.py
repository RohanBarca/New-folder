"""
MedSync — JWT Token Utilities
-------------------------------
Creates and verifies signed JWT access tokens for authenticated sessions.

SECURITY:
  - Tokens are signed with SECRET_KEY (HS256) loaded from .env only.
  - Tokens encode: user_account_id, patient_id, role, and expiry.
  - The SECRET_KEY is NEVER returned in any API response or logged.
  - Verification raises HTTPException(401) on invalid/expired tokens.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import HTTPException, status

from ..config import SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger(__name__)


def create_access_token(
    user_account_id: str,
    patient_id: Optional[str],
    role: str = "patient",
    expires_minutes: Optional[int] = None,
) -> str:
    """
    Creates a signed JWT access token encoding the authenticated user context.

    Args:
        user_account_id: UUID of the UserAccount record.
        patient_id: UUID of the linked Patient record (may be None briefly).
        role: RBAC role string (patient | doctor | admin).
        expires_minutes: Override token lifetime. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Signed JWT string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_account_id),   # subject = user account UUID
        "pid": str(patient_id) if patient_id else None,  # patient UUID
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "medsync",
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> dict:
    """
    Verifies and decodes a JWT access token.

    Returns:
        Decoded payload dict with: sub, pid, role, exp, iat.

    Raises:
        HTTPException(401) if token is invalid, expired, or malformed.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
