import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from ..config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB
from ..services.ocr_service import OCRService

router = APIRouter(prefix="/api/ocr", tags=["OCR"])

@router.post("/extract")
async def extract_document_text(file: UploadFile = File(...)):
    """
    Receives an uploaded medical document (PDF/JPG/PNG), validates it,
    and extracts text via OCR.space API.
    """
    if not file or not file.filename:
        return {
            "success": False,
            "text": "",
            "error": "No file uploaded. Please select a medical document."
        }

    # 1. Validate extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return {
            "success": False,
            "text": "",
            "error": f"Unsupported file type '{file_ext}'. Supported formats: PDF, JPG, JPEG, PNG."
        }

    # 2. Read content and validate size
    try:
        content = await file.read()
        file_size = len(content)

        if file_size == 0:
            return {
                "success": False,
                "text": "",
                "error": "The uploaded file is empty. Please select a valid document."
            }

        if file_size > MAX_FILE_SIZE_BYTES:
            return {
                "success": False,
                "text": "",
                "error": f"File size ({round(file_size / (1024 * 1024), 2)} MB) exceeds the maximum limit of {MAX_FILE_SIZE_MB} MB."
            }

        # 3. Call OCR service
        result = await OCRService.extract_text(content, file.filename)
        return result

    except Exception as e:
        return {
            "success": False,
            "text": "",
            "error": "Failed to process the uploaded document. Please try again."
        }
