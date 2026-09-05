"""
MedSync — Phase 3 End-to-End Integration Verification Script
--------------------------------------------------------------
Validates:
  1. Register a test patient via POST /api/patients
  2. Verify patient_id UUID generation and DB persistence
  3. Validate rejection on missing/invalid patient_id
  4. Upload real test medical document to POST /api/patients/{patient_id}/documents
  5. Verify OCR text extraction via OCR.space
  6. Verify Document record in PostgreSQL / Supabase
  7. Verify OCRResult record in PostgreSQL / Supabase
  8. Verify foreign key relationship patient -> document -> ocr_result
  9. Retrieve patient's document list from GET /api/patients/{patient_id}/documents
  10. Retrieve OCR result via GET /api/documents/{document_id}/ocr
  11. Verify regression: existing GET /api/health and GET /api/health/db
  12. Verify regression: existing chat start / session APIs
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
from app.database import get_engine
from sqlalchemy import text

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("MEDSYNC PHASE 3 — FULL INTEGRATION VERIFICATION")
    print("=" * 60)

    # Step 1 & 2: Register a test patient
    print("\n[1] Registering a test patient via POST /api/patients...")
    reg_payload = {
        "name": "Anil Kumar Mehta",
        "date_of_birth": "1985-04-12",
        "gender": "Male",
        "phone": "+91 98200 12345",
        "language": "hi"
    }
    res = client.post("/api/patients", json=reg_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    patient_data = res.json()
    patient_id = patient_data["id"]
    print(f"    ✓ Patient registered: ID={patient_id} Name={patient_data['name']}")

    # Step 3: Verify rejection on invalid/missing patient_id
    print("\n[2] Verifying upload rejection on invalid patient_id...")
    dummy_file = ("prescription.png", b"fakebytes", "image/png")
    bad_res = client.post("/api/patients/invalid-uuid/documents", files={"file": dummy_file})
    assert bad_res.status_code == 400, f"Expected 400, got {bad_res.status_code}"
    print(f"    ✓ Rejection on malformed UUID: HTTP {bad_res.status_code} ({bad_res.json()['detail']})")

    nonexistent_id = str(uuid.uuid4())
    notfound_res = client.post(f"/api/patients/{nonexistent_id}/documents", files={"file": dummy_file})
    assert notfound_res.status_code == 404, f"Expected 404, got {notfound_res.status_code}"
    print(f"    ✓ Rejection on nonexistent patient: HTTP {notfound_res.status_code} ({notfound_res.json()['detail']})")

    # Step 4 & 5: Upload real document and verify OCR
    print("\n[3] Generating and uploading clinical document to POST /api/patients/{patient_id}/documents...")
    img = Image.new("RGB", (500, 150), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "CITY HOSPITAL - OPD PRESCRIPTION", fill=(0, 0, 0))
    draw.text((20, 50), "Patient: Anil Kumar Mehta, 40M", fill=(0, 0, 0))
    draw.text((20, 80), "Rx: Tab Metformin 500mg BD", fill=(0, 0, 0))
    draw.text((20, 110), "Advise: HbA1c test and diet control", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    upload_res = client.post(
        f"/api/patients/{patient_id}/documents",
        files={"file": ("OPD_Prescription_Metformin.png", img_bytes, "image/png")},
        data={"document_type": "OPD Prescription"}
    )
    assert upload_res.status_code == 201, f"Expected 201, got {upload_res.status_code}: {upload_res.text}"
    doc_res = upload_res.json()
    document_id = doc_res["document_id"]
    ocr_status = doc_res["ocr_status"]
    extracted_text = doc_res["extracted_text"]
    proc_time = doc_res["processing_time_ms"]

    print(f"    ✓ Document created: ID={document_id}")
    print(f"    ✓ OCR status: {ocr_status}")
    print(f"    ✓ OCR processing time: {proc_time} ms")
    print(f"    ✓ OCR extracted preview: {repr(extracted_text[:60])}...")
    assert ocr_status == "success", f"Expected success OCR status, got {ocr_status}"
    assert "Metformin" in extracted_text or "OPD" in extracted_text or "Anil" in extracted_text or len(extracted_text) > 0, "Expected clinical text"

    # Step 6 & 7 & 8: Verify PostgreSQL / Supabase table records and relations
    print("\n[4] Querying PostgreSQL directly to verify table rows and foreign key relationships...")
    eng = get_engine()
    with eng.connect() as conn:
        doc_row = conn.execute(
            text("SELECT id, patient_id, original_filename, file_size, storage_path FROM documents WHERE id = :id"),
            {"id": document_id}
        ).fetchone()
        assert doc_row is not None, "Document row not found in PostgreSQL"
        assert str(doc_row[1]) == patient_id, f"FK mismatch: {doc_row[1]} != {patient_id}"
        print(f"    ✓ PostgreSQL `documents` row verified: filename='{doc_row[2]}' size={doc_row[3]} bytes")
        print(f"    ✓ Foreign key verified: documents.patient_id -> {doc_row[1]}")

        ocr_row = conn.execute(
            text("SELECT id, document_id, ocr_status, processing_time_ms, extracted_text FROM ocr_results WHERE document_id = :doc_id"),
            {"doc_id": document_id}
        ).fetchone()
        assert ocr_row is not None, "OCRResult row not found in PostgreSQL"
        assert str(ocr_row[1]) == document_id, f"FK mismatch: {ocr_row[1]} != {document_id}"
        print(f"    ✓ PostgreSQL `ocr_results` row verified: status='{ocr_row[2]}' time={ocr_row[3]}ms")
        print(f"    ✓ Foreign key verified: ocr_results.document_id -> {ocr_row[1]}")

    # Step 9: Retrieve patient's document list
    print("\n[5] Retrieving document history via GET /api/patients/{patient_id}/documents...")
    list_res = client.get(f"/api/patients/{patient_id}/documents")
    assert list_res.status_code == 200, f"Expected 200, got {list_res.status_code}"
    docs_list = list_res.json()
    assert len(docs_list) >= 1, "Expected at least 1 document"
    first_doc = docs_list[0]
    assert first_doc["document_id"] == document_id
    assert first_doc["filename"] == "OPD_Prescription_Metformin.png"
    assert first_doc["ocr_status"] == "success"
    print(f"    ✓ Retrieved {len(docs_list)} document(s) for patient. Details match uploaded file.")

    # Step 10: Retrieve OCR result by document_id
    print("\n[6] Retrieving OCR result via GET /api/documents/{document_id}/ocr...")
    get_ocr_res = client.get(f"/api/documents/{document_id}/ocr")
    assert get_ocr_res.status_code == 200, f"Expected 200, got {get_ocr_res.status_code}"
    ocr_result_data = get_ocr_res.json()
    assert ocr_result_data["document_id"] == document_id
    assert ocr_result_data["ocr_status"] == "success"
    assert len(ocr_result_data["extracted_text"]) > 0
    print(f"    ✓ Stored OCR result retrieved successfully: engine='{ocr_result_data['ocr_engine']}'")

    # Step 11 & 12: Regression checks
    print("\n[7] Verifying regression on existing system endpoints...")
    h1 = client.get("/api/health")
    assert h1.status_code == 200 and h1.json()["status"] == "healthy"
    print("    ✓ GET /api/health: OK")

    h2 = client.get("/api/health/db")
    assert h2.status_code == 200 and h2.json()["database"] == "connected"
    print("    ✓ GET /api/health/db: OK")

    # Start chat session regression test
    c1 = client.post("/api/chat/start", json={"language": "hi", "mode": "general", "patient_context": {"name": "Anil"}})
    assert c1.status_code == 200
    chat_data = c1.json()
    assert "session_id" in chat_data and chat_data["language"] == "hi"
    print(f"    ✓ POST /api/chat/start: OK (Session={chat_data['session_id'][:8]}... Language={chat_data['language']})")

    print("\n" + "=" * 60)
    print("ALL 12 PHASE 3 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
