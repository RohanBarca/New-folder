"""
MedSync — Database Configuration
----------------------------------
Provides SQLAlchemy engine, session factory, declarative base, and
the FastAPI-compatible get_db() dependency.

DATABASE_URL is loaded exclusively from backend/.env via config.py.
Credentials are NEVER logged, printed, or exposed in API responses.
"""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

from .config import DATABASE_URL


# ──────────────────────────────────────────────────────────────
# SQLAlchemy Engine
# ──────────────────────────────────────────────────────────────
# Supabase PostgreSQL: pool_pre_ping ensures stale connections are detected
engine = None
SessionLocal = None
_last_db_url = None

def get_engine():
    global engine, SessionLocal, _last_db_url
    
    # Reload from backend/.env explicitly on check
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=True)
        
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return None
        
    if engine is not None and _last_db_url == url:
        return engine

        
    from .config import DATABASE_URL as CURRENT_DB_URL
    url = os.getenv("DATABASE_URL", "").strip() or (CURRENT_DB_URL or "").strip()
    if not url:
        return None
        
    try:
        # Standardize postgres:// to postgresql:// if needed (Supabase strings often use postgres://)
        # SQLAlchemy 1.4+ / 2.0 requires postgresql:// or postgresql+psycopg2://
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
            
        connect_args = {}
        # Ensure SSL requirement is met for Supabase (if not already specified in query string)
        if "sslmode" not in url:
            connect_args["sslmode"] = "require"
            
        engine = create_engine(
            url,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            echo=False,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        _last_db_url = url
        logger.info("SQLAlchemy engine initialized successfully.")
        return engine
    except Exception as exc:
        err_type = type(exc).__name__
        logger.warning(f"Failed to initialize SQLAlchemy engine ({err_type}). Check DATABASE_URL in backend/.env.")
        return None



# ──────────────────────────────────────────────────────────────
# Declarative Base — all models must inherit from this
# ──────────────────────────────────────────────────────────────
Base = declarative_base()


# ──────────────────────────────────────────────────────────────
# FastAPI Dependency: get_db()
# ──────────────────────────────────────────────────────────────
def get_db():
    """
    Yields a database session per request, then closes it.
    Usage in route handlers:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    eng = get_engine()
    if eng is None or SessionLocal is None:
        raise RuntimeError(
            "Database is not configured. "
            "Set DATABASE_URL in backend/.env to enable database features."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# Database Health Check Helper
# ──────────────────────────────────────────────────────────────
def check_db_connection() -> tuple[bool, str]:
    """
    Tests the database connection with a lightweight SQL statement.
    Returns (True, "connected") if connected.
    Returns (False, safe_diagnostic_reason) if not.
    NEVER returns or prints password or connection string.
    """
    # Check if DATABASE_URL is present in backend/.env
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=True)
    
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return False, "DATABASE_URL is missing or empty in backend/.env. Please save the file with DATABASE_URL=..."
        
    eng = get_engine()
    if eng is None:
        return False, "Failed to initialize SQLAlchemy engine with provided DATABASE_URL."
        
    try:
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "connected"
    except SQLAlchemyError as exc:
        err_name = type(exc).__name__
        # Extract underlying driver error safely without credentials
        cause = getattr(exc, "orig", None)
        cause_name = type(cause).__name__ if cause else err_name
        
        # Safe categorization
        cause_str = str(cause).lower() if cause else str(exc).lower()
        if "password authentication failed" in cause_str:
            diag = f"Authentication failed (password incorrect for database user)."
        elif "could not translate host name" in cause_str or "nodename nor servname provided" in cause_str:
            diag = f"Host resolution failed (check Supabase host address in DATABASE_URL)."
        elif "connection refused" in cause_str:
            diag = f"Connection refused (host unreachable on specified port)."
        elif "ssl" in cause_str:
            diag = f"SSL negotiation failed ({cause_name})."
        elif "timeout" in cause_str or "timed out" in cause_str:
            diag = f"Connection timed out (database host not reachable or paused)."
        elif "database" in cause_str and "does not exist" in cause_str:
            diag = f"Target database name does not exist on PostgreSQL host."
        else:
            diag = f"Database connection error: {err_name} / {cause_name}."
            
        logger.warning(f"Database health check failed safely: {diag}")
        return False, diag



# ──────────────────────────────────────────────────────────────
# Table Initialization (Non-Destructive)
# ──────────────────────────────────────────────────────────────
def init_db():
    """
    Creates all tables that do not yet exist in the database.
    SAFE: Uses CREATE TABLE IF NOT EXISTS semantics via SQLAlchemy.
    NEVER drops tables or deletes data.

    Must be called AFTER all models have been imported so that
    Base.metadata contains all registered table schemas.
    """
    eng = get_engine()
    if eng is None:
        logger.warning("init_db() skipped: database engine is not configured.")
        return

    # Import models here to register them with Base.metadata before create_all
    from .models import Patient, Document, OCRResult, ChatSession, ChatMessage, AyushHistory, FinalSummary, Consent, AuditLog, UserAccount  # noqa: F401

    try:
        Base.metadata.create_all(bind=eng)
        logger.info("Database tables verified / created successfully (non-destructive).")
    except SQLAlchemyError as exc:
        # Log the exception type but not the full message to avoid leaking credentials
        logger.error("Database table initialization failed: %s", type(exc).__name__)

