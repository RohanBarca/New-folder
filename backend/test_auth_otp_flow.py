"""
MedSync — Comprehensive Mobile OTP & Authentication Test Suite
-----------------------------------------------------------------
Validates:
  1. Phone number normalization (+91 canonical format) and rejection of invalid formats.
  2. OTP dispatch via /api/auth/mobile/send-otp (with mock provider fallback).
  3. Resend cooldown enforcement (HTTP 429).
  4. Invalid OTP rejection (HTTP 400).
  5. Max attempts enforcement (HTTP 429).
  6. Successful OTP verification, UserAccount creation, and JWT issue.
  7. /api/auth/me user profile resolution with Bearer token.
  8. Idempotent login (subsequent logins reuse the existing patient_id).
  9. Cross-patient isolation: Patient A cannot access Patient B's data (HTTP 403).
 10. Audit logging of authentication events.
"""

import os
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Force Mock OTP provider during automated tests so tests run reliably without live SMS costs
os.environ["OTP_PROVIDER"] = "mock"

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_engine, SessionLocal
from app.models.user_account import UserAccount
from app.models.patient import Patient
from app.models.audit_log import AuditLog
from app.services.auth_service import normalize_phone, strip_plus, clear_otp_state
from app.core.jwt import create_access_token, decode_access_token

client = TestClient(app)


def test_phone_normalization():
    print("\n[TEST 1] Testing Indian Phone Normalization...")
    # Valid formats
    assert normalize_phone("+91 98765 43210") == "+919876543210"
    assert normalize_phone("91 9876543210") == "+919876543210"
    assert normalize_phone("09876543210") == "+919876543210"
    assert normalize_phone("9876543210") == "+919876543210"
    assert normalize_phone("+91-98765-43210") == "+919876543210"

    # Strip plus
    assert strip_plus("+919876543210") == "919876543210"

    # Invalid formats
    assert normalize_phone("12345") is None
    assert normalize_phone("5876543210") is None  # Does not start with 6-9
    assert normalize_phone("abcdefghij") is None
    assert normalize_phone("") is None
    print("  --> PASSED: Phone normalization accurate and secure.")


def test_send_otp_flow():
    print("\n[TEST 2] Testing Send OTP API (/api/auth/mobile/send-otp)...")
    test_phone = "+919876500001"
    clear_otp_state(test_phone)

    # 1. Successful dispatch
    res = client.post("/api/auth/mobile/send-otp", json={"phone": test_phone})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert "request_id" in data
    assert data["phone_masked"] == "+91****0001"
    print("  --> Send OTP succeeded with request_id.")

    # 2. Cooldown enforcement (immediate resend should return 429)
    res_cooldown = client.post("/api/auth/mobile/send-otp", json={"phone": test_phone})
    assert res_cooldown.status_code == 429, f"Expected 429, got {res_cooldown.status_code}"
    print("  --> PASSED: Resend cooldown correctly enforced.")


def test_verify_otp_invalid_and_max_attempts():
    print("\n[TEST 3] Testing Invalid OTP and Max Attempts Enforcement...")
    test_phone = "+919876500002"
    clear_otp_state(test_phone)

    # Send OTP first
    send_res = client.post("/api/auth/mobile/send-otp", json={"phone": test_phone})
    req_id = send_res.json()["request_id"]

    # Try wrong OTP
    res_wrong = client.post(
        "/api/auth/mobile/verify-otp",
        json={"phone": test_phone, "otp": "000000", "request_id": req_id},
    )
    assert res_wrong.status_code == 400, f"Expected 400, got {res_wrong.status_code}"
    print("  --> Invalid OTP correctly rejected with 400.")

    # Attempt up to max attempts (5)
    for _ in range(5):
        client.post(
            "/api/auth/mobile/verify-otp",
            json={"phone": test_phone, "otp": "000000", "request_id": req_id},
        )

    # 6th attempt should be blocked with 429
    res_blocked = client.post(
        "/api/auth/mobile/verify-otp",
        json={"phone": test_phone, "otp": "180706", "request_id": req_id},
    )
    assert res_blocked.status_code == 429, f"Expected 429 on max attempts exceeded, got {res_blocked.status_code}"
    print("  --> PASSED: Max attempts rate-limiting correctly enforced.")


def test_successful_otp_login_and_idempotency():
    print("\n[TEST 4] Testing Successful OTP Login & Account Idempotency...")
    test_phone = f"+9198765{str(uuid.uuid4().int)[:5]}"
    clear_otp_state(test_phone)

    # 1. Send OTP
    send_res = client.post("/api/auth/mobile/send-otp", json={"phone": test_phone})
    assert send_res.status_code == 200
    req_id = send_res.json()["request_id"]

    # 2. Verify OTP (mock provider accepts 123456)
    verify_res = client.post(
        "/api/auth/mobile/verify-otp",
        json={"phone": test_phone, "otp": "180706", "request_id": req_id},
    )
    assert verify_res.status_code == 200, f"Expected 200, got {verify_res.status_code}: {verify_res.text}"
    auth_data = verify_res.json()
    assert auth_data["authenticated"] is True
    assert "access_token" in auth_data
    patient_id_1 = auth_data["user"]["patient_id"]
    user_id_1 = auth_data["user"]["id"]
    token_1 = auth_data["access_token"]
    assert auth_data["user"]["is_new_patient"] is True
    print(f"  --> Account created: user_id={user_id_1}, patient_id={patient_id_1}")

    # 3. Test /api/auth/me with the issued Bearer JWT
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_1}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["patient_id"] == patient_id_1
    assert me_data["role"] == "patient"
    print("  --> /api/auth/me resolved authenticated profile.")

    # 4. Repeated Login with same phone — MUST return the same patient_id (NO duplicates)
    clear_otp_state(test_phone)
    send_res_2 = client.post("/api/auth/mobile/send-otp", json={"phone": test_phone})
    req_id_2 = send_res_2.json()["request_id"]

    verify_res_2 = client.post(
        "/api/auth/mobile/verify-otp",
        json={"phone": test_phone, "otp": "180706", "request_id": req_id_2},
    )
    assert verify_res_2.status_code == 200
    auth_data_2 = verify_res_2.json()
    patient_id_2 = auth_data_2["user"]["patient_id"]
    user_id_2 = auth_data_2["user"]["id"]
    assert auth_data_2["user"]["is_new_patient"] is False

    assert patient_id_1 == patient_id_2, "CRITICAL ERROR: Duplicate patient was created on second login!"
    assert user_id_1 == user_id_2, "CRITICAL ERROR: Duplicate user account was created!"
    print("  --> PASSED: One verified phone = One UserAccount = One patient_id (IDEMPOTENT).")


def test_phone_only_login_is_not_available():
    print("\n[TEST 4B] Confirming that phone-only login is disabled...")
    res = client.post("/api/auth/mobile/login", json={"phone": "+919876500003"})
    assert res.status_code == 404
    print("  --> PASSED: authentication requires successful OTP verification.")


def test_cross_patient_isolation():
    print("\n[TEST 5] Testing Cross-Patient Isolation (Patient A cannot access Patient B)...")
    phone_a = f"+9198765{str(uuid.uuid4().int)[:5]}"
    phone_b = f"+9198765{str(uuid.uuid4().int)[:5]}"

    # Login Patient A
    send_a = client.post("/api/auth/mobile/send-otp", json={"phone": phone_a})
    req_id_a = send_a.json()["request_id"]
    res_a = client.post("/api/auth/mobile/verify-otp", json={"phone": phone_a, "otp": "180706", "request_id": req_id_a})
    assert res_a.status_code == 200, f"Patient A verify failed: {res_a.text}"
    token_a = res_a.json()["access_token"]
    patient_a_id = res_a.json()["user"]["patient_id"]

    # Login Patient B
    send_b = client.post("/api/auth/mobile/send-otp", json={"phone": phone_b})
    req_id_b = send_b.json()["request_id"]
    res_b = client.post("/api/auth/mobile/verify-otp", json={"phone": phone_b, "otp": "180706", "request_id": req_id_b})
    assert res_b.status_code == 200, f"Patient B verify failed: {res_b.text}"
    patient_b_id = res_b.json()["user"]["patient_id"]

    # Patient A attempts to access Patient B's profile
    res_cross = client.get(
        f"/api/patients/{patient_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_cross.status_code == 403, f"Expected 403 Forbidden on cross-patient access, got {res_cross.status_code}"

    # Patient A accesses own profile -> 200 OK
    res_own = client.get(
        f"/api/patients/{patient_a_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_own.status_code == 200
    print("  --> PASSED: Cross-patient access strictly rejected with 403 Forbidden.")


def test_audit_logs():
    print("\n[TEST 6] Testing Audit Logging of Auth Events...")
    import app.database as db_mod
    engine = db_mod.get_engine()
    if engine and db_mod.SessionLocal:
        db = db_mod.SessionLocal()
        try:
            logs = db.query(AuditLog).filter(AuditLog.resource_type.in_(["auth", "user_account"])).all()
            assert len(logs) > 0, "Expected audit logs for auth events"
            print(f"  --> PASSED: Found {len(logs)} audit entries for authentication actions.")
        finally:
            db.close()
    else:
        print("  --> SKIPPED: Database engine not configured for direct query.")


if __name__ == "__main__":
    print("==========================================================")
    print("   MEDSYNC — REAL MOBILE OTP & SECURITY TEST SUITE        ")
    print("==========================================================")
    test_phone_normalization()
    test_send_otp_flow()
    test_verify_otp_invalid_and_max_attempts()
    test_successful_otp_login_and_idempotency()
    test_cross_patient_isolation()
    test_audit_logs()
    print("\n==========================================================")
    print("   ALL TESTS COMPLETED WITH 100% SUCCESS!                 ")
    print("==========================================================")
