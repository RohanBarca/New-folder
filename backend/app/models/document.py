"""
MedSync — Document SQLAlchemy Model
-------------------------------------
Represents the `documents` table in Supabase PostgreSQL.

Stores metadata for uploaded medical documents (prescriptions, lab reports,
discharge summaries, etc.) associated with a specific patient.

Binary files are stored locally in uploads/ (or cloud storage), NOT inside PostgreSQL.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class Document(Base):
    """Maps to the `documents` table in the MedSync PostgreSQL database."""

    __tablename__ = "documents"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique document identifier (UUIDv4)"
    )

    # ── Patient Foreign Key ──────────────────────────────────────────────────
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key linking to patients.id"
    )

    # ── File Metadata ────────────────────────────────────────────────────────
    original_filename = Column(
        String(255),
        nullable=False,
        comment="Original name of the uploaded file"
    )

    file_type = Column(
        String(50),
        nullable=True,
        comment="MIME type or file extension (e.g. 'application/pdf', '.png')"
    )

    file_size = Column(
        Integer,
        nullable=True,
        comment="Size of the uploaded file in bytes"
    )

    document_type = Column(
        String(100),
        nullable=True,
        default="Medical Document",
        comment="Category of medical document (e.g. 'OPD Prescription', 'Lab Report')"
    )

    storage_path = Column(
        String(500),
        nullable=True,
        comment="Relative path or cloud storage reference where the file is stored"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    uploaded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Upload timestamp (UTC)"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Record creation timestamp (UTC)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    patient = relationship("Patient", back_populates="documents")
    ocr_result = relationship("OCRResult", back_populates="document", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Document id={self.id!r} filename={self.original_filename!r} patient_id={self.patient_id!r}>"

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation."""
        ocr_status = "pending"
        extracted_text = None
        processing_time_ms = None
        if self.ocr_result:
            ocr_status = self.ocr_result.ocr_status
            extracted_text = self.ocr_result.extracted_text
            processing_time_ms = self.ocr_result.processing_time_ms

        return {
            "document_id": str(self.id),
            "patient_id": str(self.patient_id),
            "filename": self.original_filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "document_type": self.document_type or "Medical Document",
            "storage_path": self.storage_path,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "ocr_status": ocr_status,
            "extracted_text": extracted_text,
            "processing_time_ms": processing_time_ms,
        }
