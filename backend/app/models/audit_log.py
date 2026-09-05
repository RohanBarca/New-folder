"""
MedSync — AuditLog SQLAlchemy Model
-------------------------------------
Represents the `audit_logs` table in PostgreSQL.

Tracks security, access, and clinical operations for compliance & traceability:
  - Patient registration, document upload, OCR processing, AI summary generation
  - Consent grants & revocations
  - Doctor access and FHIR export
  - ABDM and voice interaction attempts

SAFETY & PRIVACY:
  - Secrets, passwords, and complete raw medical dumps are NEVER stored in details (JSONB).
  - Actor metadata and timestamps are immutable once created.
"""

import uuid
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base


class AuditLog(Base):
    """Maps to the `audit_logs` table in PostgreSQL."""

    __tablename__ = "audit_logs"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique audit log entry identifier (UUIDv4)"
    )

    # ── Associated Patient (Optional / Nullable) ─────────────────────────────
    patient_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="Associated patient UUID if the action is patient-specific"
    )

    # ── Actor Information ────────────────────────────────────────────────────
    actor_type = Column(
        String(50),
        nullable=False,
        default="patient",
        index=True,
        comment="Actor role: patient, doctor, admin, system"
    )

    actor_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Identifier for the actor (user ID, session ID, or service name)"
    )

    # ── Action & Resource ────────────────────────────────────────────────────
    action = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Action performed (e.g. patient_registered, consent_granted, fhir_exported)"
    )

    resource_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Resource type: patient, document, chat_session, final_summary, consent, fhir_bundle, abdm, voice"
    )

    resource_id = Column(
        String(255),
        nullable=True,
        comment="ID of the affected resource"
    )

    # ── Sanitized Metadata (JSONB) ───────────────────────────────────────────
    details = Column(
        JSONB,
        nullable=True,
        comment="Sanitized operation metadata — no secrets, passwords, or full clinical dumps"
    )

    # ── Timestamp ────────────────────────────────────────────────────────────
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        index=True,
        comment="Immutable audit event timestamp (UTC)"
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id!r} action={self.action!r} "
            f"actor={self.actor_type!r} resource={self.resource_type!r}>"
        )

    def to_dict(self) -> dict:
        """Returns dictionary representation for administrative review."""
        return {
            "id": str(self.id),
            "patient_id": str(self.patient_id) if self.patient_id else None,
            "actor_type": self.actor_type,
            "actor_id": self.actor_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "metadata": self.details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

