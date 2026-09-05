"""Provider-independent speech-to-text service for MedSync."""

import abc
from typing import Any

import httpx

from ..config import (
    ASR_MAX_AUDIO_SIZE_BYTES,
    ASR_PROVIDER,
    ASR_TIMEOUT_SECONDS,
    LANGUAGE_BCP47,
    LANGUAGE_CODE_ALIASES,
    SARVAM_API_KEY,
    SARVAM_ASR_URL,
)


class ASRProvider(abc.ABC):
    """Replaceable audio-to-text provider contract."""

    @abc.abstractmethod
    async def transcribe(self, audio_bytes: bytes, content_type: str, language: str) -> dict[str, Any]:
        raise NotImplementedError


class SarvamASRProvider(ASRProvider):
    """Sarvam Speech-to-Text REST provider."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def transcribe(self, audio_bytes: bytes, content_type: str, language: str) -> dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("Sarvam ASR is not configured on the backend.")
        language = LANGUAGE_CODE_ALIASES.get(language.strip().lower(), "unknown") if language else "unknown"
        if not audio_bytes:
            raise ValueError("Audio file is empty.")
        if len(audio_bytes) > ASR_MAX_AUDIO_SIZE_BYTES:
            raise ValueError("Audio file exceeds the configured size limit.")

        headers = {"api-subscription-key": self.api_key}
        provider_content_type = "audio/webm" if content_type.lower().startswith("audio/webm") else content_type
        filename = "medsync-recording.webm" if provider_content_type == "audio/webm" else "medsync-recording.audio"
        files = {"file": (filename, audio_bytes, provider_content_type)}
        data = {
            "language_code": "unknown",
            "model": "saaras:v3",
            "mode": "transcribe",
        }
        timeout = httpx.Timeout(ASR_TIMEOUT_SECONDS, connect=10.0)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(SARVAM_ASR_URL, headers=headers, files=files, data=data)
        except httpx.TimeoutException as exc:
            raise TimeoutError("Sarvam ASR request timed out.") from exc
        except httpx.HTTPError as exc:
            raise RuntimeError("Unable to connect to Sarvam ASR.") from exc

        if response.status_code >= 400:
            detail = ""
            try:
                error_payload = response.json()
                detail = str(error_payload.get("detail") or error_payload.get("message") or "").strip()
            except (TypeError, ValueError):
                pass
            safe_detail = f": {detail[:240]}" if detail else ""
            raise RuntimeError(f"Sarvam ASR request failed with status {response.status_code}{safe_detail}.")
        try:
            payload = response.json()
            transcript = str(payload.get("transcript") or "").strip()
            detected_language = str(payload.get("language_code") or "").strip()
        except (TypeError, ValueError) as exc:
            raise RuntimeError("Sarvam ASR returned an invalid response.") from exc
        if not transcript:
            raise ValueError("No speech was detected in the audio.")

        normalized_language = LANGUAGE_CODE_ALIASES.get(detected_language.lower(), "")
        if not normalized_language:
            raise ValueError("Sarvam did not return a supported detected language.")
        return {
            "success": True,
            "text": transcript,
            "language": LANGUAGE_BCP47[normalized_language],
        }


def get_asr_provider() -> ASRProvider:
    if ASR_PROVIDER == "sarvam":
        return SarvamASRProvider(SARVAM_API_KEY)
    raise RuntimeError("ASR_PROVIDER must be set to sarvam.")


async def transcribe_with_active_provider(audio_bytes: bytes, content_type: str, language: str) -> dict[str, Any]:
    return await get_asr_provider().transcribe(audio_bytes, content_type, language)
