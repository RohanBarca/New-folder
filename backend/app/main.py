import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .api.ocr import router as ocr_router
from .api.summarize import router as summarize_router
from .api.chat import router as chat_router
from .api.patients import router as patients_router
from .api.documents import router as documents_router
from .api.consents import router as consents_router
from .api.fhir import router as fhir_router
from .api.abdm import router as abdm_router
from .api.voice import router as voice_router
from .api.asr import router as asr_router
from .api.auth import router as auth_router
from .database import check_db_connection, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe non-destructive table initialization (CREATE TABLE IF NOT EXISTS)
    try:
        init_db()
    except Exception:
        pass
    yield


app = FastAPI(
    title="MedSync API",
    description="Backend API for MedSync — AI-Assisted Medical History Platform (Powered by Groq)",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local React Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:4174",
        "http://127.0.0.1:4174",
        "http://localhost:4175",
        "http://127.0.0.1:4175",
        "http://localhost:4176",
        "http://127.0.0.1:4176",
        "http://localhost:4177",
        "http://127.0.0.1:4177",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(ocr_router)
app.include_router(summarize_router)
app.include_router(chat_router)
app.include_router(patients_router)
app.include_router(documents_router)
app.include_router(consents_router)
app.include_router(fhir_router)
app.include_router(abdm_router)
app.include_router(voice_router)
app.include_router(asr_router)


@app.get("/api/health")
async def health_check():
    """
    Returns safe service availability status.
    NEVER exposes database credentials, API keys, or secrets.
    """
    connected, _ = check_db_connection()
    ocr_key = os.getenv("OCR_SPACE_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    msg91_key = os.getenv("MSG91_AUTHKEY", "").strip()
    otp_provider = os.getenv("OTP_PROVIDER", "msg91").strip().lower()
    asr_provider = os.getenv("ASR_PROVIDER", "not_configured").strip().lower()
    abdm_enabled = os.getenv("ABDM_ENABLED", "false").strip().lower() == "true"

    return {
        "status": "healthy",
        "service": "MedSync API",
        "version": "1.0.0",
        "database": "connected" if connected else "disconnected",
        "ocr": "configured" if bool(ocr_key) else "not_configured",
        "groq": "configured" if bool(groq_key) else "not_configured",
        "otp": "configured" if (otp_provider == "mock" or bool(msg91_key)) else "not_configured",
        "otp_provider": otp_provider,
        "voice": "configured" if asr_provider != "not_configured" else "not_configured",
        "abdm": "configured" if abdm_enabled else "not_configured",
        "fhir": "available",
    }

@app.get("/api/health/db")
async def database_health_check():
    """
    Tests actual PostgreSQL connection.
    Never exposes database credentials, host, or passwords.
    """
    connected, detail = check_db_connection()
    if not connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )
    return {
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

