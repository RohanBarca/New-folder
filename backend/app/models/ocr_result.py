"""
MedSync — OCRResult SQLAlchemy Model
--------------------------------------
Represents the `ocr_results` table in Supabase PostgreSQL.

Stores extracted raw clinical text and OCR processing metadata
linked 1-to-1 with an uploaded medical document.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class OCRResult(Base):
    """Maps to the `ocr_results` table in the MedSync PostgreSQL database."""

    __tablename__ = "ocr_results"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique OCR result identifier (UUIDv4)"
    )

    # ── Document Foreign Key ─────────────────────────────────────────────────
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="Foreign key linking to documents.id (1-to-1 relationship)"
    )

    # ── OCR Content & Metadata ───────────────────────────────────────────────
    extracted_text = Column(
        Text,
        nullable=True,
        comment="Raw clinical text extracted from the document by OCR"
    )

    ocr_engine = Column(
        String(100),
        nullable=True,
        default="OCR.space Engine 2",
        comment="Name of the OCR engine used"
    )

    ocr_status = Column(
        String(50),
        nullable=False,
        default="success",
        comment="Status: 'success', 'empty', 'failed'"
    )

    processing_time_ms = Column(
        Integer,
        nullable=True,
        comment="Processing duration in milliseconds"
    )

    error_message = Column(
        Text,
        nullable=True,
        comment="Safe diagnostic error message if OCR processing failed"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Record creation timestamp (UTC)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    document = relationship("Document", back_populates="ocr_result")

    def __repr__(self) -> str:
        return f"<OCRResult id={self.id!r} document_id={self.document_id!r} status={self.ocr_status!r}>"

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation."""
        return {
            "id": str(self.id),
            "document_id": str(self.document_id),
            "extracted_text": self.extracted_text or "",
            "ocr_engine": self.ocr_engine,
            "ocr_status": self.ocr_status,
            "processing_time_ms": self.processing_time_ms,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
