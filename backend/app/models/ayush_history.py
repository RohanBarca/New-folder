"""
MedSync — AyushHistory SQLAlchemy Model
-----------------------------------------
Represents the `ayush_histories` table in Supabase PostgreSQL.

Persists structured patient responses for the 10 Dashavidha Pariksha parameters
(Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara Shakti,
Vyayama Shakti, Vaya) and holistic lifestyle parameters (Ahara, Vihara, Nidana, Samprapti).

Note: The AI assistant records the patient's self-reported tendencies; it does NOT
independently diagnose or declare doshic states.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class AyushHistory(Base):
    """Maps to the `ayush_histories` table in the MedSync PostgreSQL database."""

    __tablename__ = "ayush_histories"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
        nullable=False,
        comment="Unique AYUSH history identifier (UUIDv4)"
    )

    # ── Foreign Keys ─────────────────────────────────────────────────────────
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key linking to patients.id"
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Foreign key linking to chat_sessions.id"
    )

    # ── Dashavidha Pariksha Parameters ───────────────────────────────────────
    prakriti = Column(Text, nullable=True, comment="Constitutional tendencies (Vata/Pitta/Kapha traits)")
    vikriti = Column(Text, nullable=True, comment="Current imbalance or deviation from baseline")
    sara = Column(Text, nullable=True, comment="Tissue quality and essence (Dhatu excellence)")
    samhanana = Column(Text, nullable=True, comment="Body build and compactness")
    pramana = Column(Text, nullable=True, comment="Body proportions and measurements")
    satmya = Column(Text, nullable=True, comment="Habituation and adaptational suitability")
    sattva = Column(Text, nullable=True, comment="Mental strength and temperament")
    ahara_shakti = Column(Text, nullable=True, comment="Digestive capacity (Abhyavaharana & Jarana Shakti / Agni)")
    vyayama_shakti = Column(Text, nullable=True, comment="Physical stamina and exercise tolerance")
    vaya = Column(Text, nullable=True, comment="Age-related physiological state (Bala, Madhya, Vriddha)")

    # ── Holistic Lifestyle & Etiology Parameters ─────────────────────────────
    ahara = Column(Text, nullable=True, comment="Dietary habits, preferences, and nutritional patterns")
    vihara = Column(Text, nullable=True, comment="Daily lifestyle, occupational routine, sleep patterns")
    nidana = Column(Text, nullable=True, comment="Causative factors or triggers reported by patient")
    samprapti = Column(Text, nullable=True, comment="Patient-reported progression of symptoms")

    # ── Timestamps ────────────────────────────────────────────────────────────
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
    patient = relationship("Patient", back_populates="ayush_histories")
    session = relationship("ChatSession", back_populates="ayush_history")

    def __repr__(self) -> str:
        return f"<AyushHistory id={self.id!r} patient_id={self.patient_id!r} session_id={self.session_id!r}>"

    def to_dict(self) -> dict:
        """Returns a safe dictionary representation."""
        return {
            "id": str(self.id),
            "patient_id": str(self.patient_id),
            "session_id": str(self.session_id) if self.session_id else None,
            "prakriti": self.prakriti,
            "vikriti": self.vikriti,
            "sara": self.sara,
            "samhanana": self.samhanana,
            "pramana": self.pramana,
            "satmya": self.satmya,
            "sattva": self.sattva,
            "ahara_shakti": self.ahara_shakti,
            "vyayama_shakti": self.vyayama_shakti,
            "vaya": self.vaya,
            "ahara": self.ahara,
            "vihara": self.vihara,
            "nidana": self.nidana,
            "samprapti": self.samprapti,
            "dashavidha_pariksha": {
                "prakriti": self.prakriti,
                "vikriti": self.vikriti,
                "sara": self.sara,
                "samhanana": self.samhanana,
                "pramana": self.pramana,
                "satmya": self.satmya,
                "sattva": self.sattva,
                "ahara_shakti": self.ahara_shakti,
                "vyayama_shakti": self.vyayama_shakti,
                "vaya": self.vaya,
            },
            "lifestyle": {
                "ahara": self.ahara,
                "vihara": self.vihara,
                "nidana": self.nidana,
                "samprapti": self.samprapti,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
