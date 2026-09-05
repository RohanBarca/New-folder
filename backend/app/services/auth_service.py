"""
MedSync — Auth Service (Mobile OTP)
--------------------------------------
Business logic for mobile OTP authentication.

Responsibilities:
  - Normalize Indian mobile numbers to +91XXXXXXXXXX canonical form.
  - Enforce OTP resend cooldown (in-memory, per phone).
  - Enforce max OTP verification attempts (in-memory, per phone).
  - On successful OTP verification:
      - Find existing UserAccount by verified phone.
      - If found → reuse existing patient_id.
      - If not found → create UserAccount + Patient (exactly once, idempotent).
  - Mark phone_verified = True and update last_login_at.

SECURITY INVARIANTS:
  - OTPs are NEVER stored in the DB or logged.
  - patient_id is NEVER accepted from the frontend — always derived from DB.
  - One verified phone → exactly one UserAccount → exactly one patient_id.
  - Repeated logins never create duplicate patients.
  - Generic error messages prevent phone enumeration.
"""

import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..models.user_account import UserAccount
from ..models.patient import Patient
from ..config import OTP_RESEND_COOLDOWN_SECONDS, OTP_MAX_ATTEMPTS

logger = logging.getLogger(__name__)

# ── In-memory rate limiting store ────────────────────────────────────────────
# Maps canonical_phone → {"last_sent": datetime, "verify_attempts": int, "req_id": str}
# This is process-local. For multi-worker deployments, use Redis instead.
_OTP_STATE: dict = {}


# ── Phone Normalization ───────────────────────────────────────────────────────

def normalize_phone(raw: str) -> Optional[str]:
    """
    Normalizes an Indian mobile number to the canonical form: +91XXXXXXXXXX.

    Accepts any of:
      +91 98765 43210  →  +919876543210
      91 9876543210    →  +919876543210
      09876543210      →  +919876543210
      9876543210       →  +919876543210

    Returns None if the number cannot be parsed as a valid 10-digit Indian mobile.

    SECURITY: Does NOT log the raw number. Logs only the last 4 digits on success.
    """
    if not raw:
        return None

    # Strip all whitespace, hyphens, dots, parentheses
    digits_only = re.sub(r"[\s\-\.\(\)]", "", raw)

    # Remove leading + if present
    if digits_only.startswith("+"):
        digits_only = digits_only[1:]

    # Handle country code prefixes
    if digits_only.startswith("91") and len(digits_only) == 12:
        local = digits_only[2:]
    elif digits_only.startswith("0") and len(digits_only) == 11:
        local = digits_only[1:]
    elif len(digits_only) == 10:
        local = digits_only
    else:
        return None

    # Validate: must be exactly 10 digits, starting with 6-9
    if not re.fullmatch(r"[6-9]\d{9}", local):
        return None

    canonical = f"+91{local}"
    logger.debug("Normalized phone to +91****%s", local[-4:])
    return canonical


def strip_plus(phone: str) -> str:
    """Returns phone without the '+' prefix for MSG91 (MSG91 wants '91XXXXXXXXXX')."""
    return phone.lstrip("+") if phone else phone


# ── Cooldown Enforcement ──────────────────────────────────────────────────────

def check_resend_cooldown(phone: str) -> Tuple[bool, int]:
    """
    Returns (can_send, seconds_remaining).
    can_send=True means the cooldown has passed.
    """
    state = _OTP_STATE.get(phone, {})
    last_sent = state.get("last_sent")
    if not last_sent:
        return True, 0
    elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
    remaining = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
    if remaining > 0:
        return False, remaining
    return True, 0


def record_otp_sent(phone: str, req_id: str) -> None:
    """Records that an OTP was just dispatched for this phone."""
    _OTP_STATE[phone] = {
        "last_sent": datetime.now(timezone.utc),
        "req_id": req_id,
        "verify_attempts": 0,
    }


def record_verify_attempt(phone: str) -> Tuple[bool, int]:
    """
    Increments the verification attempt counter.
    Returns (allowed, attempts_remaining).
    allowed=False if max attempts exceeded.
    """
    state = _OTP_STATE.get(phone, {})
    attempts = state.get("verify_attempts", 0) + 1
    _OTP_STATE.setdefault(phone, {})["verify_attempts"] = attempts
    remaining = max(0, OTP_MAX_ATTEMPTS - attempts)
    return attempts <= OTP_MAX_ATTEMPTS, remaining


def clear_otp_state(phone: str) -> None:
    """Clears OTP state after successful verification."""
    _OTP_STATE.pop(phone, None)


# ── UserAccount Lookup / Creation ─────────────────────────────────────────────

def get_user_by_phone(db: Session, phone: str) -> Optional[UserAccount]:
    """Finds an existing verified UserAccount by canonical phone number."""
    return (
        db.query(UserAccount)
        .filter(UserAccount.phone == phone, UserAccount.phone_verified.is_(True))
        .first()
    )


def get_or_create_user_account(
    db: Session,
    phone: str,
) -> Tuple[UserAccount, Patient, bool]:
    """
    Implements the core identity rule:
      ONE verified phone → ONE UserAccount → ONE Patient.

    Finds the existing UserAccount + Patient by verified phone.
    If no account exists, creates exactly one of each.

    SECURITY:
      - patient_id is NEVER accepted from outside — always DB-derived.
      - Repeated calls for the same phone always return the same account.
      - No duplicate patients are ever created for the same phone.

    Returns:
        (user_account, patient, is_new_account)
    """
    # Look up by phone regardless of verification state. A previously-created
    # incomplete account must be completed, never duplicated.
    existing = db.query(UserAccount).filter(UserAccount.phone == phone).first()
    if existing:
        # Load the linked patient (defensive check for orphaned accounts)
        patient = db.query(Patient).filter(Patient.id == existing.patient_id).first()
        if patient:
            existing.phone_verified = True
            logger.info("Existing account found for phone=+91****%s", phone[-4:])
            return existing, patient, False
        # Complete an incomplete account in place; never create a second user.
        logger.warning("Incomplete UserAccount detected for phone=+91****%s", phone[-4:])

    # 2. Create a new Patient record
    phone_digits = phone.replace("+", "")  # Store "91XXXXXXXXXX" in Patient.phone
    patient_id = uuid.uuid4()
    patient = Patient(
        id=patient_id,
        name=f"Patient {phone[-4:]}",   # Placeholder name — user can update later
        phone=phone,
        language="en",
    )
    db.add(patient)
    db.flush()  # Get patient.id without committing yet

    # 3. Create UserAccount
    if existing:
        account = existing
        account.phone_verified = True
        account.auth_provider = "mobile_otp"
        account.role = "patient"
        account.patient_id = patient.id
        account.last_login_at = datetime.now(timezone.utc)
    else:
        account = UserAccount(
            id=uuid.uuid4(),
            phone=phone,
            phone_verified=True,
            auth_provider="mobile_otp",
            role="patient",
            patient_id=patient.id,
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(account)
    try:
        db.commit()
    except IntegrityError:
        # The database unique constraint handles concurrent verified requests.
        db.rollback()
        existing = db.query(UserAccount).filter(UserAccount.phone == phone).first()
        if existing and existing.patient_id:
            patient = db.query(Patient).filter(Patient.id == existing.patient_id).first()
            if patient:
                return existing, patient, False
        raise
    db.refresh(patient)
    db.refresh(account)

    logger.info("New UserAccount + Patient created for phone=+91****%s patient_id=%s", phone[-4:], patient.id)
    return account, patient, True


def update_last_login(db: Session, account: UserAccount) -> None:
    """Updates last_login_at for an existing UserAccount after successful auth."""
    try:
        account.phone_verified = True
        account.last_login_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(account)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("Failed to update last_login_at: %s", type(exc).__name__)
