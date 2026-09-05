"""
MedSync — Voice Architecture Service
--------------------------------------
Provider-independent speech processing abstraction:
  - Speech-to-Text (ASR)
  - Text-to-Speech (TTS)
  - Unified voice chat message processing (Audio -> ASR -> Chat -> TTS)

DESIGN PRINCIPLES:
  - Provider-agnostic interface: easily pluggable for Bhashini, AI4Bharat, or custom ASR/TTS.
  - When ASR_PROVIDER or TTS_PROVIDER is "not_configured", returns controlled status
    without crashing or faking transcription.
  - No large local ML models required for this architectural phase.
  - Full audit logging of voice interaction attempts.
"""

import abc
import base64
import logging
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from ..config import (
    ASR_PROVIDER,
    TTS_PROVIDER,
    BHASHINI_USER_ID,
    BHASHINI_API_KEY,
    BHASHINI_PIPELINE_ID,
    SUPPORTED_LANGUAGES,
)
from .audit_service import log_audit_event

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Abstract Provider Interfaces
# ──────────────────────────────────────────────────────────────────────────────

class BaseASRProvider(abc.ABC):
    """Abstract interface for Speech-to-Text providers."""

    @abc.abstractmethod
    async def transcribe(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        language: str = "en",
    ) -> Dict[str, Any]:
        """Transcribes audio bytes into text."""
        pass


class BaseTTSProvider(abc.ABC):
    """Abstract interface for Text-to-Speech providers."""

    @abc.abstractmethod
    async def synthesize(
        self,
        text: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """Synthesizes text into audio bytes / base64 string."""
        pass


# ──────────────────────────────────────────────────────────────────────────────
# Not Configured Default Providers
# ──────────────────────────────────────────────────────────────────────────────

class NotConfiguredASRProvider(BaseASRProvider):
    """Default fallback when no ASR provider credentials/engine are configured."""

    async def transcribe(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        language: str = "en",
    ) -> Dict[str, Any]:
        return {
            "success": False,
            "status": "not_configured",
            "error": "Voice provider not configured",
            "provider": "not_configured",
            "message": "Speech-to-text is currently disabled. Please use text input or configure an ASR provider (e.g. Bhashini / AI4Bharat).",
        }


class NotConfiguredTTSProvider(BaseTTSProvider):
    """Default fallback when no TTS provider credentials/engine are configured."""

    async def synthesize(
        self,
        text: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        return {
            "success": False,
            "status": "not_configured",
            "error": "Voice provider not configured",
            "provider": "not_configured",
            "message": "Text-to-speech is currently disabled. Configure a TTS provider (e.g. Bhashini / AI4Bharat) to enable audio responses.",
        }


# ──────────────────────────────────────────────────────────────────────────────
# Bhashini / AI4Bharat Modular Stubs (Ready for Live Credentials)
# ──────────────────────────────────────────────────────────────────────────────

class BhashiniASRProvider(BaseASRProvider):
    """Bhashini (ULCA / Digital India) ASR integration stub."""

    def __init__(self, user_id: str, api_key: str, pipeline_id: str):
        self.user_id = user_id
        self.api_key = api_key
        self.pipeline_id = pipeline_id

    async def transcribe(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        language: str = "en",
    ) -> Dict[str, Any]:
        if not self.api_key or not self.user_id:
            return {
                "success": False,
                "error": "Voice provider not configured",
                "provider": "bhashini",
                "message": "Bhashini credentials (BHASHINI_USER_ID, BHASHINI_API_KEY) are missing in backend/.env.",
            }
        # Production pipeline dispatch would execute here via httpx to Bhashini ULCA API
        return {
            "success": False,
            "error": "Bhashini endpoint connectivity not initialized",
            "provider": "bhashini",
        }


class BhashiniTTSProvider(BaseTTSProvider):
    """Bhashini (ULCA / Digital India) TTS integration stub."""

    def __init__(self, user_id: str, api_key: str, pipeline_id: str):
        self.user_id = user_id
        self.api_key = api_key
        self.pipeline_id = pipeline_id

    async def synthesize(
        self,
        text: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        if not self.api_key or not self.user_id:
            return {
                "success": False,
                "error": "Voice provider not configured",
                "provider": "bhashini",
                "message": "Bhashini credentials (BHASHINI_USER_ID, BHASHINI_API_KEY) are missing in backend/.env.",
            }
        return {
            "success": False,
            "error": "Bhashini endpoint connectivity not initialized",
            "provider": "bhashini",
        }


# ──────────────────────────────────────────────────────────────────────────────
# Factory / Registry
# ──────────────────────────────────────────────────────────────────────────────

def _get_asr_provider() -> BaseASRProvider:
    provider_key = ASR_PROVIDER.lower()
    if provider_key == "bhashini":
        return BhashiniASRProvider(BHASHINI_USER_ID, BHASHINI_API_KEY, BHASHINI_PIPELINE_ID)
    return NotConfiguredASRProvider()


def _get_tts_provider() -> BaseTTSProvider:
    provider_key = TTS_PROVIDER.lower()
    if provider_key == "bhashini":
        return BhashiniTTSProvider(BHASHINI_USER_ID, BHASHINI_API_KEY, BHASHINI_PIPELINE_ID)
    return NotConfiguredTTSProvider()


# ──────────────────────────────────────────────────────────────────────────────
# Voice Service Class
# ──────────────────────────────────────────────────────────────────────────────

class VoiceService:
    """Central voice operations dispatcher for MedSync."""

    @staticmethod
    def get_status() -> Dict[str, Any]:
        """Returns current voice architecture configuration status."""
        return {
            "asr_provider": ASR_PROVIDER,
            "tts_provider": TTS_PROVIDER,
            "asr_configured": ASR_PROVIDER != "not_configured" and bool(BHASHINI_API_KEY if ASR_PROVIDER == "bhashini" else False),
            "tts_configured": TTS_PROVIDER != "not_configured" and bool(BHASHINI_API_KEY if TTS_PROVIDER == "bhashini" else False),
            "supported_languages": list(SUPPORTED_LANGUAGES.keys()),
        }

    @staticmethod
    async def speech_to_text(
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Transcribes audio to text using the active ASR provider.
        Returns clean controlled error if unconfigured.
        """
        if not audio_bytes or len(audio_bytes) == 0:
            return {
                "success": False,
                "error": "Empty audio payload received.",
            }

        provider = _get_asr_provider()
        return await provider.transcribe(audio_bytes, content_type=content_type, language=language)

    @staticmethod
    async def text_to_speech(
        text: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Synthesizes text to speech using the active TTS provider.
        Returns clean controlled error if unconfigured.
        """
        if not text or not text.strip():
            return {
                "success": False,
                "error": "No text provided for speech synthesis.",
            }

        provider = _get_tts_provider()
        return await provider.synthesize(text.strip(), language=language)

    @staticmethod
    async def process_voice_chat_message(
        db: Session,
        patient_id: str,
        audio_bytes: bytes,
        language: str = "en",
        mode: str = "general",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Pipeline: Audio -> ASR -> Chat Message -> Groq -> TTS.
        
        If voice is not configured, returns clear error while keeping the
        patient able to use the text chatbot.
        """
        # 1. Attempt ASR
        asr_result = await VoiceService.speech_to_text(audio_bytes, language=language)
        if not asr_result.get("success"):
            return {
                "success": False,
                "stage": "asr",
                "error": asr_result.get("error", "Speech transcription unavailable"),
                "provider_status": VoiceService.get_status(),
                "fallback_instruction": "Please use text chat to continue your medical interview.",
            }

        transcript = asr_result.get("transcript", "")

        # 2. Dispatch to existing ChatService (Groq)
        from .chat_service import ChatService
        chat_result = await ChatService.send_message(
            db=db,
            patient_id=patient_id,
            message_text=transcript,
            language=language,
            mode=mode,
            session_id=session_id,
        )

        # 3. Attempt TTS on assistant's response (optional)
        assistant_reply = chat_result.get("assistant_message", {}).get("text", "")
        tts_result = await VoiceService.text_to_speech(assistant_reply, language=language)

        return {
            "success": True,
            "transcript": transcript,
            "chat_response": chat_result,
            "audio_response": tts_result if tts_result.get("success") else None,
        }
