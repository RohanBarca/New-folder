# Sarvam Speech-to-Text setup

MedSync uses Sarvam's current REST Speech-to-Text API. The provider is selected with:

`ASR_PROVIDER=sarvam`

The API key must remain in `backend/.env`:

`SARVAM_API_KEY=...`

The provider uses the documented REST endpoint:

`POST https://api.sarvam.ai/speech-to-text`

It sends `file`, `language_code`, `model=saaras:v3`, and `mode=transcribe` as multipart form fields. Sarvam officially supports WebM, so browser recordings do not require ffmpeg conversion.

The independent endpoint is `POST /api/asr/transcribe` with multipart fields `file` and `language` (`en` or `hi`). The transcript is returned to the browser and is not sent to Groq automatically.