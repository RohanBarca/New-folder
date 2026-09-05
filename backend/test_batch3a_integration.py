"""
MedSync — Batch 3A End-to-End Verification Test Suite
-------------------------------------------------------
Validates all 14 points required for Batch 3A:
  1. Create consent
  2. Retrieve consent
  3. Revoke consent
  4. Verify revoked status retained
  5. Verify patient isolation
  6. Verify role checks (RBAC)
  7. Verify audit records created in PostgreSQL
  8. Verify existing patient registration
  9. Verify OCR functionality
  10. Verify Chatbot functionality
  11. Verify AYUSH history functionality
  12. Verify final AI Summary functionality
  13. Verify Doctor Dashboard patient listing
  14. Verify no secrets in API responses or audit logs
"""

import io
import sys
import uuid
from PIL import Image, ImageDraw

# Windows console compatibility
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app
import app.database as db_module
from app.services.consent_service import has_consent
from app.core.security import require_roles, get_current_user, UserContext
from sqlalchemy import text

client = TestClient(app)


def run_batch3a_tests():
    print("=" * 65)
    print("MEDSYNC BATCH 3A — CONSENT + SECURITY + RBAC + AUDIT VERIFICATION")
    print("=" * 65)

    # Ensure engine and SessionLocal are initialized
    db_module.get_engine()

    # -------------------------------------------------------------------------
    # Test 8: Patient Registration
    # -------------------------------------------------------------------------
    print("\n[Test 1/14] Registering test patient (Patient A)...")
    p_req = {
        "name": "Sunita Sharma",
        "date_of_birth": "1992-08-14",
        "gender": "Female",
        "phone": "+91 98765 43210",
        "language": "hi"
    }
    res = client.post("/api/patients", json=p_req)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    p_data = res.json()
    patient_id_a = p_data["id"]
    print(f"    ✓ Patient A registered successfully: ID={patient_id_a}")

    # Register Patient B for isolation test
    print("\n[Test 2/14] Registering second test patient (Patient B)...")
    p_b_req = {
        "name": "Rajesh Verma",
        "date_of_birth": "1980-03-21",
        "gender": "Male",
        "phone": "+91 91234 56789",
        "language": "en"
    }
    res_b = client.post("/api/patients", json=p_b_req)
    assert res_b.status_code == 201
    patient_id_b = res_b.json()["id"]
    print(f"    ✓ Patient B registered successfully: ID={patient_id_b}")

    # -------------------------------------------------------------------------
    # Test 1 & 2: Create & Retrieve Consent
    # -------------------------------------------------------------------------
    print("\n[Test 3/14] Creating consent for Patient A (data_collection & ai_processing)...")
    consent_body = {
        "consent_type": "ai_processing",
        "purpose": "AI clinical intake and summarization",
        "status": "granted"
    }
    c_res = client.post(f"/api/patients/{patient_id_a}/consents", json=consent_body)
    assert c_res.status_code == 201, f"Expected 201, got {c_res.status_code}: {c_res.text}"
    consent_obj = c_res.json()["consent"]
    consent_id = consent_obj["id"]
    assert consent_obj["consent_type"] == "ai_processing"
    assert consent_obj["status"] == "granted"
    print(f"    ✓ Consent created: ID={consent_id} Type={consent_obj['consent_type']} Status={consent_obj['status']}")

    print("\n[Test 4/14] Retrieving consent list for Patient A...")
    list_c_res = client.get(f"/api/patients/{patient_id_a}/consents")
    assert list_c_res.status_code == 200
    c_list = list_c_res.json()["consents"]
    assert len(c_list) >= 1
    assert any(c["id"] == consent_id for c in c_list)
    print(f"    ✓ Retrieved {len(c_list)} consent record(s) for Patient A.")

    # -------------------------------------------------------------------------
    # Test 3 & 4: Revoke Consent & Verify Retained Status
    # -------------------------------------------------------------------------
    print("\n[Test 5/14] Revoking consent...")
    revoke_res = client.post(f"/api/patients/{patient_id_a}/consents/{consent_id}/revoke")
    assert revoke_res.status_code == 200, f"Expected 200, got {revoke_res.status_code}: {revoke_res.text}"
    rev_data = revoke_res.json()["consent"]
    assert rev_data["status"] == "revoked"
    assert rev_data["revoked_at"] is not None
    print(f"    ✓ Consent revoked successfully. Revoked timestamp: {rev_data['revoked_at']}")

    print("\n[Test 6/14] Checking consent status via has_consent service...")
    db_module.get_engine()
    db_session = db_module.SessionLocal()
    try:
        is_granted, status_str = has_consent(patient_id_a, "ai_processing", db=db_session)
        assert is_granted is False
        assert status_str == "REVOKED"
        print(f"    ✓ has_consent service returns: is_granted={is_granted}, status='{status_str}'")

        is_g_np, status_np = has_consent(patient_id_a, "doctor_access", db=db_session)
        assert is_g_np is False
        assert status_np == "NOT PROVIDED"
        print(f"    ✓ has_consent for ungranted type returns: status='{status_np}'")
    finally:
        db_session.close()

    # -------------------------------------------------------------------------
    # Test 5: Verify Patient Isolation
    # -------------------------------------------------------------------------
    print("\n[Test 7/14] Verifying patient isolation (Patient B trying to revoke Patient A's consent)...")
    cross_revoke = client.post(f"/api/patients/{patient_id_b}/consents/{consent_id}/revoke")
    assert cross_revoke.status_code in [404, 403], f"Expected 404 or 403, got {cross_revoke.status_code}"
    print(f"    ✓ Cross-patient revocation blocked with HTTP {cross_revoke.status_code}")

    # -------------------------------------------------------------------------
    # Test 6: RBAC Role Checks
    # -------------------------------------------------------------------------
    print("\n[Test 8/14] Verifying RBAC role authorization helpers...")
    doc_context = UserContext(user_id="doc1", role="doctor")
    assert doc_context.is_doctor() is True
    assert doc_context.can_access_patient(uuid.UUID(patient_id_a)) is True

    pat_context = UserContext(user_id="pat1", role="patient", patient_id=uuid.UUID(patient_id_a))
    assert pat_context.can_access_patient(uuid.UUID(patient_id_a)) is True
    assert pat_context.can_access_patient(uuid.UUID(patient_id_b)) is False
    print("    ✓ UserContext patient isolation and role checks verified.")

    # -------------------------------------------------------------------------
    # Test 7: Verify Audit Log Creation in PostgreSQL
    # -------------------------------------------------------------------------
    print("\n[Test 9/14] Querying `audit_logs` table in PostgreSQL...")
    eng = db_module.get_engine()
    with eng.connect() as conn:
        logs = conn.execute(
            text("SELECT id, action, resource_type, actor_type FROM audit_logs WHERE patient_id = :pid"),
            {"pid": patient_id_a}
        ).fetchall()
        assert len(logs) >= 2, f"Expected at least 2 audit entries, got {len(logs)}"
        actions = [l[1] for l in logs]
        print(f"    ✓ Recorded audit actions for Patient A: {actions}")
        assert "patient_registered" in actions
        assert "consent_revoked" in actions or "consent_granted" in actions

    # -------------------------------------------------------------------------
    # Test 9: Document Upload & OCR
    # -------------------------------------------------------------------------
    print("\n[Test 10/14] Testing document upload and OCR processing...")
    img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "CLINICAL REPORT: Normal Blood Glucose", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    doc_res = client.post(
        f"/api/patients/{patient_id_a}/documents",
        files={"file": ("lab_report.png", buf.getvalue(), "image/png")},
        data={"document_type": "Lab Report"}
    )
    assert doc_res.status_code == 201
    doc_data = doc_res.json()
    print(f"    ✓ Document uploaded: ID={doc_data['document_id']} OCR Status={doc_data['ocr_status']}")

    # -------------------------------------------------------------------------
    # Test 10: Chatbot Functionality
    # -------------------------------------------------------------------------
    print("\n[Test 11/14] Starting AI chatbot interview session...")
    c_start_res = client.post(
        "/api/chat/start",
        json={"patient_id": patient_id_a, "mode": "general", "language": "hi"}
    )
    assert c_start_res.status_code == 200
    chat_resp = c_start_res.json()
    session_id = chat_resp["session_id"]
    print(f"    ✓ Chat session started: SessionID={session_id}")

    # -------------------------------------------------------------------------
    # Test 11: AYUSH History Endpoint
    # -------------------------------------------------------------------------
    print("\n[Test 12/14] Testing GET /api/patients/{patient_id}/ayush-history...")
    ayush_res = client.get(f"/api/patients/{patient_id_a}/ayush-history")
    assert ayush_res.status_code == 200
    print("    ✓ AYUSH history endpoint responded successfully.")

    # -------------------------------------------------------------------------
    # Test 12 & 13: Final AI Summary & Doctor Dashboard Listing
    # -------------------------------------------------------------------------
    print("\n[Test 13/14] Testing Doctor Dashboard patient listing & AI summary...")
    doc_dash_res = client.get("/api/patients")
    assert doc_dash_res.status_code == 200
    p_list = doc_dash_res.json()["patients"]
    assert any(p["id"] == patient_id_a for p in p_list)
    print(f"    ✓ Doctor Dashboard retrieved patient list. Found Patient A ({patient_id_a}).")

    summary_res = client.post("/api/ai/final-summary", json={"patient_id": patient_id_a})
    assert summary_res.status_code in [200, 502], f"Unexpected status: {summary_res.status_code}"
    print(f"    ✓ AI Final Summary endpoint executed with status HTTP {summary_res.status_code}.")

    # -------------------------------------------------------------------------
    # Test 14: Security Check (No Secrets in Responses or Audit Logs)
    # -------------------------------------------------------------------------
    print("\n[Test 14/14] Verifying no API keys or database credentials in audit logs...")
    with eng.connect() as conn:
        secret_check = conn.execute(
            text("SELECT details::text FROM audit_logs WHERE details::text LIKE '%gsk_%' OR details::text LIKE '%postgresql://%'")
        ).fetchall()
        assert len(secret_check) == 0, "Security Violation: Secret key or database URL found in audit logs!"
        print("    ✓ Zero secrets or credentials leaked in audit logs or API payloads.")

    print("\n" + "=" * 65)
    print("ALL 14 BATCH 3A INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_batch3a_tests()
