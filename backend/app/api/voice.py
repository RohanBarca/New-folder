"""
MedSync — Voice Architecture API Router
-----------------------------------------
Endpoints:
  POST /api/voice/transcribe       — Speech-to-Text
  POST /api/voice/synthesize       — Text-to-Speech
  POST /api/chat/voice-message     — Audio-in, text/audio-out conversational pipeline
  GET  /api/voice/status           — Returns provider readiness status

DESIGN:
  - Provider-independent: works seamlessly with Bhashini, AI4Bharat, or unconfigured fallback.
  - When unconfigured, returns clean HTTP 200 with `{ "success": false, "error": "Voice provider not configured" }`.
  - Audited and securely validated.
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.voice_service import VoiceService
from ..services.audit_service import log_audit_event
from ..core.security import validate_patient_id, verify_patient_exists

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Voice Architecture"])


class SynthesizeRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


class VoiceChatRequest(BaseModel):
    patient_id: str
    language: Optional[str] = "en"
    mode: Optional[str] = "general"
    session_id: Optional[str] = None


@router.get("/api/voice/status")
async def get_voice_status():
    """
    Returns current voice service provider configuration and availability.
    """
    return VoiceService.get_status()


@router.post("/api/voice/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en"),
    patient_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Transcribes uploaded audio bytes to text via the configured ASR provider.
    Returns controlled not_configured response if no ASR engine is enabled.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file provided."
        )

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read audio file: {str(exc)}"
        )

    result = await VoiceService.speech_to_text(
        audio_bytes=content,
        content_type=file.content_type or "audio/wav",
        language=language or "en",
    )

    # Record audit attempt
    pid = None
    if patient_id:
        try: pid = uuid.UUID(patient_id)
        except ValueError: pass

    log_audit_event(
        db=db,
        actor_type="patient",
        action="voice_transcribe_attempted",
        resource_type="voice",
        patient_id=pid,
        details={
            "provider": result.get("provider", "not_configured"),
            "success": result.get("success", False),
            "language": language,
        }
    )

    return result


@router.post("/api/voice/synthesize")
async def synthesize_speech(
    body: SynthesizeRequest,
    db: Session = Depends(get_db),
):
    """
    Synthesizes input text into speech audio via the configured TTS provider.
    Returns controlled not_configured response if no TTS engine is enabled.
    """
    result = await VoiceService.text_to_speech(
        text=body.text,
        language=body.language or "en",
    )
    return result


@router.post("/api/chat/voice-message")
async def send_voice_chat_message(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    language: Optional[str] = Form("en"),
    mode: Optional[str] = Form("general"),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Unified voice chat intake endpoint:
      Audio input -> ASR -> Medical Chatbot / Groq -> TTS response.
    
    If voice provider is not configured, returns clear error while the text
    chatbot remains fully operational.
    """
    uid = validate_patient_id(patient_id)
    verify_patient_exists(db, uid)

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read audio file: {str(exc)}"
        )

    result = await VoiceService.process_voice_chat_message(
        db=db,
        patient_id=str(uid),
        audio_bytes=content,
        language=language or "en",
        mode=mode or "general",
        session_id=session_id,
    )

    return result
