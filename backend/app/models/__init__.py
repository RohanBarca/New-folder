"""
MedSync — Models Package
--------------------------
Imports all SQLAlchemy ORM models so they are registered with
Base.metadata before create_all() is called in database.py.
"""

from .patient import Patient
from .document import Document
from .ocr_result import OCRResult
from .chat_session import ChatSession
from .chat_message import ChatMessage
from .ayush_history import AyushHistory
from .final_summary import FinalSummary
from .consent import Consent
from .audit_log import AuditLog
from .user_account import UserAccount

__all__ = [
    "Patient",
    "Document",
    "OCRResult",
    "ChatSession",
    "ChatMessage",
    "AyushHistory",
    "FinalSummary",
    "Consent",
    "AuditLog",
    "UserAccount",
]
