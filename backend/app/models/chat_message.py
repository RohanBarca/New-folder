"""
MedSync — ChatMessage SQLAlchemy Model
----------------------------------------
Represents the `chat_messages` table in Supabase PostgreSQL.

Persists every conversational turn (assistant question & patient answer)
in chronological order, with clinical section tagging and red flag detection.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class ChatMessage(Base):
    """Maps to the `chat_messages` table in the MedSync PostgreSQL database."""

    __tablename__ = "chat_messages"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique message identifier (UUIDv4)"
    )

    # ── Session Foreign Key ──────────────────────────────────────────────────
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key linking to chat_sessions.id"
    )

    # ── Message Attributes ───────────────────────────────────────────────────
    role = Column(
        String(50),
        nullable=False,
        comment="'assistant' or 'patient'"
    )

    message_text = Column(
        Text,
        nullable=False,
        comment="Content of the conversational turn"
    )

    section = Column(
        String(100),
        nullable=True,
        comment="Clinical section (e.g. 'chief_complaint', 'hpi', 'past_medical_history')"
    )

    question_number = Column(
        Integer,
        nullable=True,
        comment="Sequential index of the question in this session"
    )

    ayush_parameter = Column(
        String(100),
        nullable=True,
        comment="Dashavidha Pariksha parameter (e.g. 'Prakriti', 'Agni', 'Ahara')"
    )

    red_flag = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if urgent/emergency symptoms were detected in this turn"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        comment="Message timestamp (UTC)"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    session = relationship("ChatSession", back_populates="messages")

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id!r} role={self.role!r} section={self.section!r}>"

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation."""
        return {
            "id": str(self.id),
            "session_id": str(self.session_id),
            "role": self.role,
            "message_text": self.message_text,
            "section": self.section,
            "question_number": self.question_number,
            "ayush_parameter": self.ayush_parameter,
            "red_flag": self.red_flag,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
