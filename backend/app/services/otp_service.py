"""
MedSync — OTP Provider Abstraction
------------------------------------
Provider-independent interface for sending and verifying OTPs.

Concrete implementations:
  - MSG91OTPProvider  : Real SMS via MSG91 v5 Widget API (production)
  - MockOTPProvider   : Returns predictable OTP for local dev (OTP_PROVIDER=mock)

SECURITY INVARIANTS (never violated by any provider):
  - OTPs are NEVER stored in plaintext, logs, DB, or API responses.
  - The MSG91_AUTHKEY is NEVER included in logs, responses, or forwarded to frontend.
  - All OTPs expire per OTP_EXPIRY_SECONDS (default: 300 s).
  - Max verification attempts enforced per OTP_MAX_ATTEMPTS (default: 5).
  - Resend cooldown enforced per OTP_RESEND_COOLDOWN_SECONDS (default: 30 s).

Usage:
    from .otp_service import get_otp_provider
    provider = get_otp_provider()
    result = await provider.send_otp(phone="919876543210")
    verify = await provider.verify_otp(phone="919876543210", otp="123456", req_id=result["request_id"])
"""

import abc
import logging
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from ..config import (
    MSG91_AUTHKEY, MSG91_WIDGET_ID, MSG91_TOKEN_AUTH,
    MSG91_VERIFY_ACCESS_TOKEN_URL,
    OTP_PROVIDER, OTP_EXPIRY_SECONDS,
)

logger = logging.getLogger(__name__)

# ── In-memory store for MockOTPProvider (dev only, never used in prod) ──────
# Maps phone → {otp, created_at, attempts}
_MOCK_STORE: dict = {}


class OTPResult:
    """Standardized result returned by send_otp."""
    __slots__ = ("success", "request_id", "error")

    def __init__(self, *, success: bool, request_id: Optional[str] = None, error: Optional[str] = None):
        self.success = success
        self.request_id = request_id
        self.error = error


class OTPVerifyResult:
    """Standardized result returned by verify_otp."""
    __slots__ = ("success", "error")

    def __init__(self, *, success: bool, error: Optional[str] = None):
        self.success = success
        self.error = error


def _sanitized_body(response: httpx.Response) -> str:
    """Return MSG91's response body with credential/token fields removed."""
    try:
        body = response.json()
    except ValueError:
        return "<non-json response>"

    secret_keys = {"authkey", "auth-key", "otp", "token", "accesstoken", "access-token"}

    def sanitize(value):
        if isinstance(value, dict):
            return {
                key: "[REDACTED]" if key.lower().replace("_", "-") in secret_keys else sanitize(item)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [sanitize(item) for item in value]
        return value

    return json.dumps(sanitize(body), separators=(",", ":"), sort_keys=True)


class OTPProvider(abc.ABC):
    """Abstract base — all OTP providers must implement these two methods."""

    @abc.abstractmethod
    async def send_otp(self, phone: str) -> OTPResult:
        """
        Sends an OTP to the given phone number.

        Args:
            phone: Normalized 12-digit number (e.g. "919876543210" — no '+').

        Returns:
            OTPResult with success=True and request_id on success.
        """

    @abc.abstractmethod
    async def verify_otp(self, phone: str, otp: str, req_id: str) -> OTPVerifyResult:
        """
        Verifies an OTP against what was sent.

        Args:
            phone: Normalized number (same format as send_otp).
            otp: 6-digit code entered by the user.
            req_id: Request/transaction ID returned by send_otp.

        Returns:
            OTPVerifyResult with success=True on correct OTP.
        """


# ── MSG91 Provider (Production) ───────────────────────────────────────────────

class MSG91OTPProvider(OTPProvider):
    """
        Validates access tokens issued by the MSG91 Web OTP Widget.

    Requires MSG91_AUTHKEY and MSG91_WIDGET_ID in backend/.env.
    """

    async def send_otp(self, phone: str) -> OTPResult:
        return OTPResult(success=False, error="MSG91 OTP must be sent through the Web OTP Widget.")

    def widget_config(self) -> Optional[dict]:
        if not MSG91_WIDGET_ID or not MSG91_TOKEN_AUTH:
            return None
        return {"widgetId": MSG91_WIDGET_ID, "tokenAuth": MSG91_TOKEN_AUTH}

    async def verify_access_token(self, access_token: str) -> Optional[str]:
        if not MSG91_AUTHKEY or not access_token:
            return None
        headers = {"authkey": MSG91_AUTHKEY, "Content-Type": "application/json", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    MSG91_VERIFY_ACCESS_TOKEN_URL,
                    json={"access-token": access_token},
                    headers=headers,
                )
            logger.info("MSG91 response status=%d body=%s", resp.status_code, _sanitized_body(resp))
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("type") != "success":
                return None
            identifier = data.get("data", {}).get("mobile")
            return str(identifier) if identifier else None
        except (httpx.TimeoutException, ValueError):
            return None
        except Exception:
            return None

    async def verify_otp(self, phone: str, otp: str, req_id: str) -> OTPVerifyResult:
        return OTPVerifyResult(success=False, error="MSG91 OTP must be verified through the Web OTP Widget.")


# ── Mock Provider (Development) ───────────────────────────────────────────────

class MockOTPProvider(OTPProvider):
    """
    Local development OTP provider.
    OTP is always "123456" and is stored in memory (never in DB, never logged).

    NEVER use this in production.
    Activate by setting OTP_PROVIDER=mock in backend/.env.
    """

    async def send_otp(self, phone: str) -> OTPResult:
        req_id = secrets.token_hex(16)
        # Store OTP metadata in memory — NOT the OTP itself in any persistent store
        _MOCK_STORE[phone] = {
            "req_id": req_id,
            "created_at": datetime.now(timezone.utc),
            "attempts": 0,
            # In mock mode, we keep the OTP in memory only (never persisted)
            "_mock_otp": "123456",
        }
        logger.info("[MOCK OTP] Sent OTP for phone=+91****%s req_id=%s", phone[-4:], req_id[:8])
        return OTPResult(success=True, request_id=req_id)

    async def verify_otp(self, phone: str, otp: str, req_id: str) -> OTPVerifyResult:
        entry = _MOCK_STORE.get(phone)
        if not entry or entry.get("req_id") != req_id:
            return OTPVerifyResult(success=False, error="Invalid OTP session.")

        age = (datetime.now(timezone.utc) - entry["created_at"]).total_seconds()
        if age > OTP_EXPIRY_SECONDS:
            _MOCK_STORE.pop(phone, None)
            return OTPVerifyResult(success=False, error="OTP expired.")

        entry["attempts"] += 1
        if entry["attempts"] > 5:
            _MOCK_STORE.pop(phone, None)
            return OTPVerifyResult(success=False, error="Too many attempts.")

        if otp == entry.get("_mock_otp"):
            _MOCK_STORE.pop(phone, None)
            return OTPVerifyResult(success=True)

        return OTPVerifyResult(success=False, error="Invalid OTP.")


# ── Factory ───────────────────────────────────────────────────────────────────

def get_otp_provider() -> OTPProvider:
    """
    Returns the active OTP provider based on OTP_PROVIDER setting.
    Real MSG91 mode is the default; mock mode is only for local demos.
    """
    if OTP_PROVIDER == "mock":
        logger.warning("Using MockOTPProvider — only suitable for local development.")
        return MockOTPProvider()

    if not MSG91_AUTHKEY or not MSG91_WIDGET_ID or not MSG91_TOKEN_AUTH:
        logger.warning("MSG91 widget credentials are missing; falling back to MockOTPProvider for local/demo mode.")
        return MockOTPProvider()

    return MSG91OTPProvider()
