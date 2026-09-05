"""
MedSync — Consent SQLAlchemy Model
------------------------------------
Represents the `consents` table in PostgreSQL.

Supports DPDP (Digital Personal Data Protection) and ABDM consent architecture:
  - Granular consent types: data_collection, medical_history, document_processing,
    ai_processing, abdm_sharing, doctor_access, voice_processing.
  - Status tracking: granted, revoked, pending.
  - Never deletes historical consent records upon revocation; sets revoked_at.
  - Versioned consent tracking.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class Consent(Base):
    """Maps to the `consents` table in PostgreSQL."""

    __tablename__ = "consents"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique consent identifier (UUIDv4)"
    )

    # ── Patient Foreign Key ──────────────────────────────────────────────────
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key linking to patients.id"
    )

    # ── Consent Type & Purpose ───────────────────────────────────────────────
    consent_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: data_collection, medical_history, document_processing, ai_processing, abdm_sharing, doctor_access, voice_processing"
    )

    purpose = Column(
        Text,
        nullable=True,
        comment="Human-readable description of why this data is collected/processed"
    )

    # ── Status ───────────────────────────────────────────────────────────────
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="Status: granted, revoked, pending"
    )

    granted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when consent was granted (UTC)"
    )

    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when consent was revoked (UTC)"
    )

    version = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Consent policy / record version number"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Creation timestamp (UTC)"
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=datetime.now(timezone.utc),
        comment="Last updated timestamp (UTC)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    patient = relationship("Patient", back_populates="consents")

    def __repr__(self) -> str:
        return (
            f"<Consent id={self.id!r} patient_id={self.patient_id!r} "
            f"type={self.consent_type!r} status={self.status!r}>"
        )

    def to_dict(self) -> dict:
        """Returns safe dictionary representation for API responses."""
        return {
            "id": str(self.id),
            "patient_id": str(self.patient_id),
            "consent_type": self.consent_type,
            "purpose": self.purpose,
            "status": self.status,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
