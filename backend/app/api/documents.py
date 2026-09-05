"""
MedSync — Documents API Router
--------------------------------
Endpoints:
  GET /api/documents/{document_id}/ocr — Get stored OCR result for a document
  GET /api/documents/{document_id}     — Get document metadata

Phase 3: Persist OPD / Medical Documents + OCR Results
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..services.document_service import (
    get_document_ocr,
    get_document_by_id,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/{document_id}/ocr")
async def get_document_ocr_result(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves the stored OCR result for a specific document.
    Used by the Doctor Dashboard and clinical review workflows.
    """
    try:
        doc_uid = uuid.UUID(str(document_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id format. Must be a valid UUID."
        )

    # Check document exists
    doc = get_document_by_id(db, doc_uid)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    ocr = get_document_ocr(db, doc_uid)
    if not ocr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No OCR result found for document '{document_id}'."
        )

    return ocr


@router.get("/{document_id}")
async def get_document_details(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Retrieves metadata and OCR status for a single document."""
    try:
        doc_uid = uuid.UUID(str(document_id))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id format. Must be a valid UUID."
        )

    doc = get_document_by_id(db, doc_uid)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    return doc.to_dict()
