"""
MedSync — Audit Logging Service
---------------------------------
Provides centralized, safe, non-blocking audit logging for system operations.

Key Principles:
  - Never logs passwords, API keys, bearer tokens, or full credentials.
  - Never stores raw full medical document dumps in the metadata.
  - Failures in audit logging do NOT crash the primary request.
"""

import uuid
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.audit_log import AuditLog

logger = logging.getLogger(__name__)

# Keys that must NEVER be written to audit log details
SENSITIVE_KEYS = {
    "password", "token", "secret", "api_key", "authorization",
    "groq_api_key", "ocr_space_api_key", "bhashini_api_key",
    "abdm_client_secret"
}


def _sanitize_details(details: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Recursively redacts sensitive keys from audit metadata."""
    if not details or not isinstance(details, dict):
        return details

    sanitized = {}
    for k, v in details.items():
        if k.lower() in SENSITIVE_KEYS or any(s in k.lower() for s in ["key", "secret", "passw"]):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = _sanitize_details(v)
        elif isinstance(v, str) and len(v) > 2000:
            sanitized[k] = v[:2000] + "... [TRUNCATED_FOR_AUDIT]"
        else:
            sanitized[k] = v
    return sanitized


def log_audit_event(
    db: Session,
    actor_type: str,
    action: str,
    resource_type: str,
    patient_id: Optional[uuid.UUID] = None,
    actor_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Optional[AuditLog]:
    """
    Records an immutable audit event in the database.
    Safe & resilient: catches and logs DB exceptions without propagating them.
    """
    try:
        clean_details = _sanitize_details(details)
        entry = AuditLog(
            id=uuid.uuid4(),
            patient_id=patient_id,
            actor_type=actor_type or "system",
            actor_id=str(actor_id) if actor_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            details=clean_details,
        )
        db.add(entry)
        db.commit()
        return entry
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("Failed to record audit event '%s': %s", action, type(exc).__name__)
        return None
    except Exception as exc:
        logger.warning("Unexpected error during audit logging '%s': %s", action, type(exc).__name__)
        return None
