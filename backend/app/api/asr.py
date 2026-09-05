"""Independent ASR endpoint. It never forwards the transcript to Groq."""

from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from ..config import ASR_MAX_AUDIO_SIZE_BYTES, ASR_SUPPORTED_LANGUAGES
from ..services.asr_service import transcribe_with_active_provider

router = APIRouter(tags=["ASR"])
_SUPPORTED_CONTENT_TYPES = {"audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm"}
_SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm"}


@router.post("/api/asr/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = Form("en")):
    if language not in ASR_SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language. Use en or hi.")
    extension = Path(file.filename or "").suffix.lower()
    if (file.content_type or "").lower() not in _SUPPORTED_CONTENT_TYPES and extension not in _SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported audio format.")

    audio_bytes = await file.read(ASR_MAX_AUDIO_SIZE_BYTES + 1)
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")
    if len(audio_bytes) > ASR_MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds the 25 MB limit.")
    try:
        return await transcribe_with_active_provider(audio_bytes, file.content_type or "audio/wav", language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="ASR inference timed out.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="ASR inference failed.") from exc