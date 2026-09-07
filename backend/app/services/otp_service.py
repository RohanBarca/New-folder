"""Demo OTP provider for MedSync. Fixed OTP 180706 for patient signup and login."""
import abc, logging, secrets
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)
_DEMO_STORE: dict = {}

DEMO_OTP = "180706"

class OTPResult:
    def __init__(self, *, success: bool, request_id: Optional[str] = None, error: Optional[str] = None):
        self.success, self.request_id, self.error = success, request_id, error

class OTPVerifyResult:
    def __init__(self, *, success: bool, error: Optional[str] = None):
        self.success, self.error = success, error

class OTPProvider(abc.ABC):
    @abc.abstractmethod
    async def send_otp(self, phone: str) -> OTPResult: ...
    @abc.abstractmethod
    async def verify_otp(self, phone: str, otp: str, req_id: str) -> OTPVerifyResult: ...

class DemoOTPProvider(OTPProvider):
    """Demo OTP Provider. Accepts 180706 for all mobile numbers."""
    async def send_otp(self, phone: str) -> OTPResult:
        request_id = secrets.token_hex(16)
        _DEMO_STORE[phone] = {"request_id": request_id, "created_at": datetime.now(timezone.utc)}
        logger.info("Demo OTP dispatched to +91****%s (Demo OTP: %s)", phone[-4:], DEMO_OTP)
        return OTPResult(success=True, request_id=request_id)

    async def verify_otp(self, phone: str, otp: str, req_id: str) -> OTPVerifyResult:
        clean_otp = (otp or "").strip()
        if clean_otp != DEMO_OTP:
            return OTPVerifyResult(success=False, error=f"Invalid OTP. Please use demo OTP {DEMO_OTP}.")
        _DEMO_STORE.pop(phone, None)
        return OTPVerifyResult(success=True)

# Backward compatibility alias
MockOTPProvider = DemoOTPProvider

def get_otp_provider() -> OTPProvider:
    return DemoOTPProvider()

