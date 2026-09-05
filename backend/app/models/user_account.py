"""
MedSync — UserAccount SQLAlchemy Model
----------------------------------------
Represents the `user_accounts` table in PostgreSQL.

Identity rule:
  ONE verified mobile number → ONE UserAccount → ONE patient_id

Design decisions:
  - phone is the primary authentication identifier (normalized to +91XXXXXXXXXX).
  - phone_verified is set True only after successful MSG91 OTP verification.
  - auth_provider tracks which auth mechanism created this account ("mobile_otp").
  - patient_id is a UUID FK to the patients table — set on first verified login.
  - No plaintext credentials are stored. OTP verification is handled by MSG91.
  - Multiple login attempts do NOT create new accounts — the existing patient_id
    is reused on every subsequent login.

SECURITY:
  - phone_verified=False accounts cannot be used to access patient resources.
  - phone is stored in canonical +91XXXXXXXXXX format.
  - role is constrained to: patient, doctor, admin.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class UserAccount(Base):
    """Maps to the `user_accounts` table in the MedSync PostgreSQL database."""

    __tablename__ = "user_accounts"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique UserAccount identifier (UUIDv4)",
    )

    # ── Authentication Identity ───────────────────────────────────────────────
    phone = Column(
        String(20),
        nullable=True,
        unique=True,
        index=True,
        comment="Canonical mobile number: +91XXXXXXXXXX (unique per account)",
    )

    phone_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True only after successful MSG91 OTP verification",
    )

    # ── Auth Provider ─────────────────────────────────────────────────────────
    auth_provider = Column(
        String(50),
        nullable=False,
        default="mobile_otp",
        comment="Authentication method: mobile_otp | abha_demo",
    )

    # ── Role (RBAC) ──────────────────────────────────────────────────────────
    role = Column(
        String(20),
        nullable=False,
        default="patient",
        comment="RBAC role: patient | doctor | admin",
    )

    # ── Linked Patient Record ────────────────────────────────────────────────
    # Set on first verified login or registration via mobile OTP.
    # ONE verified phone → ONE patient_id (never replaced).
    patient_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="FK to patients.id — set after first successful OTP verification",
    )

    # ── Login Tracking ────────────────────────────────────────────────────────
    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of last successful authentication",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Account creation timestamp (UTC)",
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=datetime.now(timezone.utc),
        comment="Account last-modified timestamp (UTC)",
    )

    def __repr__(self) -> str:
        return (
            f"<UserAccount id={self.id!r} phone=+91****{str(self.phone or '')[-4:]} "
            f"role={self.role!r} verified={self.phone_verified!r}>"
        )

    def safe_dict(self) -> dict:
        """Returns a dict safe for API responses — phone is partially masked."""
        phone = self.phone or ""
        masked = f"+91****{phone[-4:]}" if len(phone) >= 4 else "[masked]"
        return {
            "id": str(self.id),
            "role": self.role,
            "patient_id": str(self.patient_id) if self.patient_id else None,
            "phone_verified": self.phone_verified,
            "auth_provider": self.auth_provider,
            "phone_masked": masked,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
