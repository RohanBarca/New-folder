"""
MedSync — Patient SQLAlchemy Model
-------------------------------------
Represents the `patients` table in Supabase PostgreSQL.

ABHA (Ayushman Bharat Health Account) integration is NOT yet implemented.
The abha_address column is nullable and should remain empty until ABHA
integration is officially scoped and built.

Field Rationale:
  - id            : UUID primary key (prevents enumeration attacks vs integer IDs)
  - name          : Patient's full name (required)
  - date_of_birth : For age calculation without storing mutable 'age' field
  - gender        : Self-reported gender
  - phone         : Contact number (nullable — not required at all intake points)
  - language      : BCP-47 language code used during intake (e.g. 'en', 'hi')
  - abha_address  : Nullable — only populated after ABHA integration
  - created_at    : Auto-set on insert via server_default
  - updated_at    : Auto-updated on every UPDATE via onupdate
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Date, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class Patient(Base):
    """Maps to the `patients` table in the MedSync PostgreSQL database."""

    __tablename__ = "patients"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique patient identifier (UUIDv4)"
    )

    # ── Personal Details ──────────────────────────────────────────────────────
    name = Column(
        String(255),
        nullable=False,
        comment="Patient full name as provided during registration"
    )

    date_of_birth = Column(
        Date,
        nullable=True,
        comment="Date of birth for age calculation (YYYY-MM-DD)"
    )

    gender = Column(
        String(50),
        nullable=True,
        comment="Self-reported gender (e.g. Male, Female, Other, Prefer not to say)"
    )

    phone = Column(
        String(20),
        nullable=True,
        index=True,
        comment="Patient contact phone number"
    )

    # ── Intake Preferences ────────────────────────────────────────────────────
    language = Column(
        String(10),
        nullable=True,
        default="en",
        comment="BCP-47 language code used during intake session (en | hi)"
    )

    # ── ABHA (Ayushman Bharat Health Account) — NOT YET INTEGRATED ───────────
    abha_address = Column(
        String(255),
        nullable=True,
        unique=True,
        comment="ABHA address — nullable until ABHA/ABDM integration is implemented"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Record creation timestamp (UTC, set by database)"
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=datetime.now(timezone.utc),
        comment="Record last-modified timestamp (UTC, auto-updated on change)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    documents = relationship(
        "Document",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="Document.created_at.desc()"
    )
    chat_sessions = relationship(
        "ChatSession",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="ChatSession.created_at.desc()"
    )
    ayush_histories = relationship(
        "AyushHistory",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="AyushHistory.created_at.desc()"
    )
    final_summaries = relationship(
        "FinalSummary",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="FinalSummary.created_at.desc()"
    )
    consents = relationship(
        "Consent",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="Consent.created_at.desc()"
    )

    def __repr__(self) -> str:
        return f"<Patient id={self.id!r} name={self.name!r} language={self.language!r}>"

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation (no sensitive data)."""
        return {
            "id": str(self.id),
            "name": self.name,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "gender": self.gender,
            "phone": self.phone,
            "language": self.language,
            "abha_status": "ABHA integration pending" if not self.abha_address else "Linked",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
