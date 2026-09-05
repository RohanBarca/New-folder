"""
MedSync — Document Service / Repository Layer
-----------------------------------------------
Handles medical document storage, metadata persistence in PostgreSQL,
and orchestrates text extraction via the existing OCRService.

Architecture:
  Patient (PostgreSQL)
     └── Document (PostgreSQL metadata + local storage/cloud reference)
           └── OCRResult (PostgreSQL extracted text & processing stats)
"""

import os
import re
import uuid
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.patient import Patient
from ..models.document import Document
from ..models.ocr_result import OCRResult
from .ocr_service import OCRService

logger = logging.getLogger(__name__)

# Base uploads directory (inside backend/uploads)
UPLOAD_BASE_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def _sanitize_filename(filename: str) -> str:
    """Removes path traversals and invalid characters from filename."""
    name = Path(filename).name
    # Keep alphanumeric, underscores, dots, hyphens
    sanitized = re.sub(r"[^\w\.\- ]", "_", name)
    return sanitized or "document"


def save_file_to_storage(patient_id: uuid.UUID, filename: str, content: bytes) -> str:
    """
    Saves uploaded file bytes to local storage under uploads/<patient_id>/<doc_uuid>_<filename>.
    Returns the relative storage path.
    """
    patient_dir = UPLOAD_BASE_DIR / str(patient_id)
    patient_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _sanitize_filename(filename)
    unique_prefix = uuid.uuid4().hex[:8]
    stored_filename = f"{unique_prefix}_{safe_name}"
    file_path = patient_dir / stored_filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Return relative storage path for portability
    rel_path = f"uploads/{patient_id}/{stored_filename}"
    return rel_path


async def create_patient_document_with_ocr(
    db: Session,
    patient_id: uuid.UUID,
    filename: str,
    file_bytes: bytes,
    file_type: Optional[str] = None,
    document_type: str = "Medical Document",
) -> Dict[str, Any]:
    """
    1. Validates that patient exists.
    2. Saves file to disk/storage.
    3. Creates Document record in PostgreSQL.
    4. Calls existing OCR.space service via OCRService.
    5. Creates OCRResult record in PostgreSQL.
    6. Returns unified response.
    """
    # 1. Validate patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ValueError(f"Patient with ID '{patient_id}' does not exist.")

    file_size = len(file_bytes)
    safe_filename = _sanitize_filename(filename)

    # 2. Save file to storage
    storage_path = save_file_to_storage(patient_id, safe_filename, file_bytes)

    # 3. Create Document record
    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        patient_id=patient_id,
        original_filename=safe_filename,
        file_type=file_type or Path(safe_filename).suffix.lower(),
        file_size=file_size,
        document_type=document_type or "Medical Document",
        storage_path=storage_path,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 4. Run OCR via existing OCRService
    ocr_status = "success"
    extracted_text = ""
    processing_time_ms = 0
    error_msg = None

    try:
        ocr_res = await OCRService.extract_text(file_bytes, safe_filename)
        if ocr_res.get("success"):
            extracted_text = ocr_res.get("text", "") or ""
            ocr_status = "empty" if ocr_res.get("is_empty") else "success"
            processing_time_ms = int(ocr_res.get("processing_time", 0) * 1000)
        else:
            ocr_status = "failed"
            error_msg = ocr_res.get("error") or "OCR processing failed"
    except Exception as exc:
        logger.error("OCR execution exception: %s", type(exc).__name__)
        ocr_status = "failed"
        error_msg = "OCR processing encountered an unexpected error."

    # 5. Save OCRResult record (always saved, even if failed, to preserve tracking)
    ocr_result_id = uuid.uuid4()
    ocr_result = OCRResult(
        id=ocr_result_id,
        document_id=doc.id,
        extracted_text=extracted_text,
        ocr_engine="OCR.space (Engine 2)",
        ocr_status=ocr_status,
        processing_time_ms=processing_time_ms,
        error_message=error_msg,
    )
    db.add(ocr_result)
    db.commit()
    db.refresh(ocr_result)

    return {
        "document_id": str(doc.id),
        "patient_id": str(doc.patient_id),
        "filename": doc.original_filename,
        "document_type": doc.document_type,
        "ocr_status": ocr_status,
        "extracted_text": extracted_text,
        "processing_time_ms": processing_time_ms,
        "error": error_msg,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
    }


def get_patient_documents(db: Session, patient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Retrieves all documents associated with a patient, including OCR status and text.
    """
    docs = (
        db.query(Document)
        .filter(Document.patient_id == patient_id)
        .order_by(Document.created_at.desc())
        .all()
    )

    results = []
    for doc in docs:
        results.append(doc.to_dict())
    return results


def get_document_ocr(db: Session, document_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Retrieves the OCRResult for a specific document by its UUID.
    """
    ocr = db.query(OCRResult).filter(OCRResult.document_id == document_id).first()
    if not ocr:
        return None
    return ocr.to_dict()


def get_document_by_id(db: Session, document_id: uuid.UUID) -> Optional[Document]:
    """Retrieves a single Document ORM object."""
    return db.query(Document).filter(Document.id == document_id).first()
