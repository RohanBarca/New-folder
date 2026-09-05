"""
MedSync — Configuration
------------------------
Loads all settings from backend/.env via python-dotenv.
NEVER exposes secrets in API responses, logs, or code.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Path to backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

# Load environment variables from backend/.env
load_dotenv(dotenv_path=ENV_PATH)

# ----- OCR.space Settings -----
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "")
OCR_SPACE_URL = "https://api.ocr.space/parse/image"

# ----- File Upload Limits -----
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

# ----- Groq AI Settings -----
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# ----- Database Settings (Supabase PostgreSQL) -----
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# ----- Voice Architecture Settings (ASR / TTS) -----
# ASR supports the replaceable Sarvam provider; TTS remains independent.
ASR_PROVIDER = os.getenv("ASR_PROVIDER", "not_configured").strip().lower()
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "not_configured").strip().lower()
ASR_MAX_AUDIO_SIZE_BYTES = int(os.getenv("ASR_MAX_AUDIO_SIZE_MB", "25")) * 1024 * 1024
ASR_TIMEOUT_SECONDS = int(os.getenv("ASR_TIMEOUT_SECONDS", "30"))
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
SARVAM_ASR_URL = "https://api.sarvam.ai/speech-to-text"
BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "").strip()
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "").strip()
BHASHINI_PIPELINE_ID = os.getenv("BHASHINI_PIPELINE_ID", "").strip()

# ----- ABDM (Ayushman Bharat Digital Mission) Settings -----
ABDM_ENABLED = os.getenv("ABDM_ENABLED", "false").strip().lower() == "true"
ABDM_CLIENT_ID = os.getenv("ABDM_CLIENT_ID", "").strip()
ABDM_CLIENT_SECRET = os.getenv("ABDM_CLIENT_SECRET", "").strip()
ABDM_BASE_URL = os.getenv("ABDM_BASE_URL", "https://dev.abdm.gov.in/gateway/v0.5").strip()

# ----- Security & JWT Settings -----
# SECRET_KEY must be a strong random value in production.
SECRET_KEY = os.getenv("SECRET_KEY", "medsync-dev-insecure-secret-key-replace-in-prod").strip()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
SESSION_TIMEOUT_MINUTES = int(os.getenv("SESSION_TIMEOUT_MINUTES", "60"))
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "365"))
JWT_ALGORITHM = "HS256"

# ----- MSG91 OTP Settings -----
# SECURITY: MSG91_AUTHKEY is loaded from .env only. It must NEVER appear in
# code, logs, API responses, or Git-tracked files.
MSG91_AUTHKEY = os.getenv("MSG91_AUTHKEY", "").strip()
MSG91_WIDGET_ID = os.getenv("MSG91_WIDGET_ID", "").strip()
MSG91_TOKEN_AUTH = os.getenv("MSG91_TOKEN_AUTH", "").strip()

# OTP provider: "msg91" for real SMS, "mock" for local development
OTP_PROVIDER = os.getenv("OTP_PROVIDER", "msg91").strip().lower()
OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))

# ----- MSG91 API Endpoints (v5 Widget) -----
MSG91_VERIFY_ACCESS_TOKEN_URL = "https://api.msg91.com/api/v5/widget/verifyAccessToken"

# ----- Multilingual Support -----
SUPPORTED_LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "od": "Odia",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
    "ur": "Urdu",
    "as": "Assamese",
    "ne": "Nepali",
    "kok": "Konkani",
    "ks": "Kashmiri",
    "sd": "Sindhi",
    "sa": "Sanskrit",
    "sat": "Santali",
    "mni": "Manipuri",
    "brx": "Bodo",
    "mai": "Maithili",
    "doi": "Dogri",
}
LANGUAGE_BCP47: dict[str, str] = {code: f"{code}-IN" for code in SUPPORTED_LANGUAGES}
LANGUAGE_BCP47["od"] = "od-IN"
LANGUAGE_BCP47["en"] = "en-IN"
LANGUAGE_BCP47["hi"] = "hi-IN"
LANGUAGE_CODE_ALIASES: dict[str, str] = {
    **{code: code for code in SUPPORTED_LANGUAGES},
    **{bcp47.lower(): code for code, bcp47 in LANGUAGE_BCP47.items()},
    "or-in": "od",
}
DEFAULT_LANGUAGE = "en"
ASR_SUPPORTED_LANGUAGES = set(SUPPORTED_LANGUAGES)


def normalize_language_code(language: str | None) -> str:
    """Return the canonical short code for a supported Sarvam language."""
    if not language:
        return DEFAULT_LANGUAGE
    return LANGUAGE_CODE_ALIASES.get(language.strip().lower(), DEFAULT_LANGUAGE)


def detect_text_language(text: str | None) -> str | None:
    """Detect an Indic script in typed text without changing Latin-language behavior."""
    if not text:
        return None
    ranges = {
        "hi": (0x0900, 0x097F),
        "bn": (0x0980, 0x09FF),
        "gu": (0x0A80, 0x0AFF),
        "pa": (0x0A00, 0x0A7F),
        "ta": (0x0B80, 0x0BFF),
        "te": (0x0C00, 0x0C7F),
        "kn": (0x0C80, 0x0CFF),
        "ml": (0x0D00, 0x0D7F),
        "or": (0x0B00, 0x0B7F),
    }
    counts = {code: 0 for code in ranges}
    for character in text:
        point = ord(character)
        for code, (start, end) in ranges.items():
            if start <= point <= end:
                counts[code] += 1
    detected = max(counts, key=counts.get)
    return "od" if detected == "or" and counts[detected] else (detected if counts[detected] else None)
