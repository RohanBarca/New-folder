"""
MedSync — FinalSummary SQLAlchemy Model
-----------------------------------------
Represents the `final_summaries` table in Supabase PostgreSQL.

Stores AI-generated structured patient summaries produced by the Final
Summary Engine (Batch 2). Each summary is versioned: every new generation
inserts a new row rather than overwriting an existing one, so the full
history of generated summaries is preserved and traceable.

Design decisions:
  - summary_json (JSONB) holds the full structured Groq output.
  - summary_text is a plain-text fallback (clinical_summary field).
  - data_sources_used records which data types contributed to this generation.
  - model_name records which Groq model produced the summary.
  - Versioning is implicit via created_at DESC ordering.

SAFETY:
  - This table is NEVER written without a valid patient_id FK.
  - The Groq API key is NEVER stored in this table or any response.
  - Summary content is AI-generated and requires physician verification.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, Integer, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from ..database import Base


class FinalSummary(Base):
    """Maps to the `final_summaries` table in the MedSync PostgreSQL database."""

    __tablename__ = "final_summaries"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique summary record identifier (UUIDv4)"
    )

    # ── Patient Foreign Key ──────────────────────────────────────────────────
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key linking to patients.id — never null"
    )

    # ── Summary Content ───────────────────────────────────────────────────────
    summary_json = Column(
        JSONB,
        nullable=True,
        comment="Full structured AI-generated summary as JSONB (Groq output)"
    )

    summary_text = Column(
        Text,
        nullable=True,
        comment="Plain-text clinical_summary extracted from summary_json for quick display"
    )

    # ── Generation Metadata ───────────────────────────────────────────────────
    model_name = Column(
        String(100),
        nullable=True,
        comment="Groq model used to generate this summary (e.g. llama-3.3-70b-versatile)"
    )

    data_sources_used = Column(
        JSONB,
        nullable=True,
        comment="JSON list of data source types included: patient_profile, documents, ocr, chatbot, ayush_history"
    )

    generation_version = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Auto-incremented version number per patient (latest = highest)"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Timestamp when this summary was generated (UTC)"
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=datetime.now(timezone.utc),
        comment="Record last-modified timestamp (UTC)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    patient = relationship("Patient", back_populates="final_summaries")

    def __repr__(self) -> str:
        return (
            f"<FinalSummary id={self.id!r} patient_id={self.patient_id!r} "
            f"version={self.generation_version!r} model={self.model_name!r}>"
        )

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation for API responses."""
        return {
            "id": str(self.id),
            "patient_id": str(self.patient_id),
            "summary_json": self.summary_json,
            "summary_text": self.summary_text,
            "model_name": self.model_name,
            "data_sources_used": self.data_sources_used,
            "generation_version": self.generation_version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
