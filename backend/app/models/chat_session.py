"""
MedSync — ChatSession SQLAlchemy Model
----------------------------------------
Represents the `chat_sessions` table in Supabase PostgreSQL.

Persists AI history-taking interview sessions linked to a patient.
Supports both General Medical mode and AYUSH History mode (Dashavidha Pariksha).
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class ChatSession(Base):
    """Maps to the `chat_sessions` table in the MedSync PostgreSQL database."""

    __tablename__ = "chat_sessions"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique chat session identifier (UUIDv4)"
    )

    # ── Patient Foreign Key ──────────────────────────────────────────────────
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key linking to patients.id"
    )

    # ── Mode & Language ──────────────────────────────────────────────────────
    mode = Column(
        String(50),
        nullable=False,
        default="general",
        comment="Session mode: 'general' or 'ayush'"
    )

    language = Column(
        String(10),
        nullable=False,
        default="en",
        comment="Active language code: 'en' or 'hi'"
    )

    status = Column(
        String(50),
        nullable=False,
        default="active",
        comment="Session status: 'active' or 'completed'"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Timestamp when session interview started"
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when interview was completed"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Record creation timestamp (UTC)"
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=datetime.now(timezone.utc),
        comment="Record last-modified timestamp (UTC)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    patient = relationship("Patient", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at.asc()"
    )
    ayush_history = relationship(
        "AyushHistory",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ChatSession id={self.id!r} patient_id={self.patient_id!r} mode={self.mode!r} status={self.status!r}>"

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation."""
        return {
            "session_id": str(self.id),
            "patient_id": str(self.patient_id),
            "mode": self.mode,
            "language": self.language,
            "current_language": self.language,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "message_count": len(self.messages) if self.messages else 0,
        }
