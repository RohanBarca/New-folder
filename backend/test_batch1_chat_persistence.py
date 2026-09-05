"""
MedSync — Batch 1: Clinical History + AYUSH Data Persistence Test Suite
-------------------------------------------------------------------------
Automated verification for:
  - Test A: Start General chat with valid patient_id -> ChatSession created & initial AI question saved
  - Test B: Send patient response -> Chronological turns (patient & AI) saved in PostgreSQL
  - Test C: AYUSH mode -> Dashavidha Pariksha questions & parameters stored in ayush_histories
  - Test D: Mid-conversation language switch -> DB updated & history preserved
  - Test E: Complete conversation -> status='completed' & completed_at timestamp set
  - Test F: Retrieval APIs -> chat-sessions, messages, ayush-history match PostgreSQL
  - Test G: Security -> Cross-patient session access rejected (HTTP 403)
  - Test H: Edge cases -> Missing/invalid patient_id (HTTP 400/404), invalid session_id, clean null AYUSH
"""

import sys
import uuid
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_engine, SessionLocal
from app.models.patient import Patient
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.ayush_history import AyushHistory


def run_batch1_tests():
    print("\n========================================================")
    print("MEDSYNC BATCH 1: CHAT & AYUSH PERSISTENCE VERIFICATION")
    print("========================================================\n")

    client = TestClient(app)
    passed_tests = 0
    total_tests = 8

    # Create 2 unique test patients in PostgreSQL for testing & isolation
    engine = get_engine()
    assert engine is not None, "Database engine must be configured."
    import app.database as db_mod
    SessionLocal = db_mod.SessionLocal
    assert SessionLocal is not None, "SessionLocal must be initialized."

    with SessionLocal() as db:
        pat_a_id = uuid.uuid4()
        patient_a = Patient(
            id=pat_a_id,
            name="Batch1 Test Patient A",
            gender="Female",
            phone="9876500001",
            language="en"
        )
        pat_b_id = uuid.uuid4()
        patient_b = Patient(
            id=pat_b_id,
            name="Batch1 Test Patient B",
            gender="Male",
            phone="9876500002",
            language="hi"
        )
        db.add_all([patient_a, patient_b])
        db.commit()

    patient_a_str = str(pat_a_id)
    patient_b_str = str(pat_b_id)
    print(f"[SETUP] Created test patients in PostgreSQL:\n  Patient A: {patient_a_str}\n  Patient B: {patient_b_str}\n")

    session_id_a = None

    try:
        # ----------------------------------------------------
        # TEST A: Start General chat with valid patient_id
        # ----------------------------------------------------
        print("[TEST A] Start General chat with valid patient_id...")
        res_a = client.post("/api/chat/start", json={
            "patient_id": patient_a_str,
            "mode": "general",
            "language": "en"
        })
        assert res_a.status_code == 200, f"Expected 200, got {res_a.status_code}: {res_a.text}"
        data_a = res_a.json()
        assert data_a.get("success") is True
        assert data_a.get("session_id") is not None
        assert data_a.get("patient_id") == patient_a_str
        assert data_a.get("question") is not None
        session_id_a = data_a["session_id"]

        # Verify PostgreSQL state
        with SessionLocal() as db:
            cs = db.query(ChatSession).filter(ChatSession.id == uuid.UUID(session_id_a)).first()
            assert cs is not None, "ChatSession row not found in PostgreSQL!"
            assert str(cs.patient_id) == patient_a_str
            assert cs.mode == "general"
            assert cs.status == "active"
            assert cs.started_at is not None

            # Verify initial assistant question saved in chat_messages
            msgs = db.query(ChatMessage).filter(ChatMessage.session_id == cs.id).all()
            assert len(msgs) == 1, f"Expected 1 initial message, found {len(msgs)}"
            assert msgs[0].role == "assistant"
            assert msgs[0].message_text == data_a["question"]

        print(f"  [OK] Session {session_id_a} persisted in PostgreSQL (status=active)")
        print(f"  [OK] Initial assistant question saved: '{data_a['question'][:60]}...'")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST B: Send patient response & verify chronological turns
        # ----------------------------------------------------
        print("\n[TEST B] Send patient response & verify chronological turns...")
        patient_reply = "I have had a throbbing headache and mild fever for 2 days."
        res_b = client.post("/api/chat/message", json={
            "session_id": session_id_a,
            "patient_id": patient_a_str,
            "message": patient_reply,
            "language": "en"
        })
        assert res_b.status_code == 200, f"Expected 200, got {res_b.status_code}: {res_b.text}"
        data_b = res_b.json()
        assert data_b.get("success") is True
        assert data_b.get("question") is not None

        with SessionLocal() as db:
            msgs = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == uuid.UUID(session_id_a))
                .order_by(ChatMessage.created_at.asc())
                .all()
            )
            assert len(msgs) == 3, f"Expected 3 turns (assistant, patient, assistant), found {len(msgs)}"
            assert msgs[0].role == "assistant"
            assert msgs[1].role == "patient"
            assert msgs[1].message_text == patient_reply
            assert msgs[2].role == "assistant"
            assert msgs[2].message_text == data_b["question"]
            assert msgs[0].created_at <= msgs[1].created_at <= msgs[2].created_at

        print(f"  [OK] Turn 1 (Assistant): '{msgs[0].message_text[:45]}...'")
        print(f"  [OK] Turn 2 (Patient):   '{msgs[1].message_text}'")
        print(f"  [OK] Turn 3 (Assistant): '{msgs[2].message_text[:45]}...'")
        print("  [OK] Chronological order strictly preserved in PostgreSQL")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST C: AYUSH mode & parameter persistence
        # ----------------------------------------------------
        print("\n[TEST C] Start AYUSH mode & verify Dashavidha Pariksha parameter storage...")
        res_c = client.post("/api/chat/start", json={
            "patient_id": patient_a_str,
            "session_id": session_id_a,
            "mode": "ayush",
            "language": "en"
        })
        assert res_c.status_code == 200, f"Expected 200, got {res_c.status_code}: {res_c.text}"
        data_c = res_c.json()
        assert data_c.get("mode") == "ayush"
        ayush_param = data_c.get("ayush_parameter", "Prakriti")
        print(f"  [OK] AYUSH Mode initialized. Parameter: {ayush_param}")

        # Send answer for AYUSH parameter
        ayush_answer = "I have a slim build, tend to feel colder, and have irregular appetite."
        res_c_msg = client.post("/api/chat/message", json={
            "session_id": session_id_a,
            "patient_id": patient_a_str,
            "message": ayush_answer,
            "language": "en"
        })
        assert res_c_msg.status_code == 200, f"Expected 200, got {res_c_msg.status_code}: {res_c_msg.text}"

        # Verify ayush_histories table in PostgreSQL
        with SessionLocal() as db:
            ayush_rec = db.query(AyushHistory).filter(AyushHistory.session_id == uuid.UUID(session_id_a)).first()
            assert ayush_rec is not None, "AyushHistory row not found in PostgreSQL!"
            assert str(ayush_rec.patient_id) == patient_a_str
            # At least one parameter must have stored the patient's answer
            stored_vals = [
                ayush_rec.prakriti, ayush_rec.vikriti, ayush_rec.sara,
                ayush_rec.ahara_shakti, ayush_rec.ahara
            ]
            has_val = any(v is not None and len(v) > 0 for v in stored_vals)
            assert has_val, "Patient AYUSH response was not saved into AyushHistory columns!"

        print(f"  [OK] AYUSH History recorded in PostgreSQL for patient {patient_a_str}")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST D: Mid-conversation language switch (EN -> HI)
        # ----------------------------------------------------
        print("\n[TEST D] Mid-conversation language switch (EN -> HI)...")
        res_d = client.patch(f"/api/chat/session/{session_id_a}/language", json={
            "language": "hi",
            "patient_id": patient_a_str
        })
        assert res_d.status_code == 200, f"Expected 200, got {res_d.status_code}: {res_d.text}"
        assert res_d.json().get("language") == "hi"

        # Verify PostgreSQL ChatSession updated
        with SessionLocal() as db:
            cs = db.query(ChatSession).filter(ChatSession.id == uuid.UUID(session_id_a)).first()
            assert cs.language == "hi", f"Expected language 'hi', found '{cs.language}'"

        # Send next answer in Hindi
        res_d_msg = client.post("/api/chat/message", json={
            "session_id": session_id_a,
            "patient_id": patient_a_str,
            "message": "मुझे रात में नींद देर से आती है और भूख कम लगती है।",
            "language": "hi"
        })
        assert res_d_msg.status_code == 200
        data_d_msg = res_d_msg.json()
        print(f"  [OK] Session language switched to 'hi' in PostgreSQL")
        print(f"  [OK] AI responded progressively: '{data_d_msg.get('question', '')[:50]}...'")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST E: Complete conversation
        # ----------------------------------------------------
        print("\n[TEST E] Complete conversation status & completed_at timestamp...")
        from app.services.chat_history_service import complete_chat_session
        with SessionLocal() as db:
            complete_chat_session(db, uuid.UUID(session_id_a))
            cs = db.query(ChatSession).filter(ChatSession.id == uuid.UUID(session_id_a)).first()
            assert cs.status == "completed"
            assert cs.completed_at is not None

        print(f"  [OK] Session status marked 'completed' at {cs.completed_at.isoformat()}")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST F: Call retrieval APIs
        # ----------------------------------------------------
        print("\n[TEST F] Call chat and AYUSH retrieval APIs...")
        # 1. GET /api/patients/{patient_id}/chat-sessions
        res_f1 = client.get(f"/api/patients/{patient_a_str}/chat-sessions")
        assert res_f1.status_code == 200
        sessions_list = res_f1.json()
        assert len(sessions_list) >= 1
        found_sess = next((s for s in sessions_list if s["session_id"] == session_id_a), None)
        assert found_sess is not None
        assert found_sess["status"] == "completed"
        print(f"  [OK] GET /api/patients/{patient_a_str}/chat-sessions -> {len(sessions_list)} session(s)")

        # 2. GET /api/chat/sessions/{session_id}/messages
        res_f2 = client.get(f"/api/chat/sessions/{session_id_a}/messages?patient_id={patient_a_str}")
        assert res_f2.status_code == 200
        msgs_list = res_f2.json()
        assert len(msgs_list) >= 4
        assert msgs_list[0]["role"] == "assistant"
        assert msgs_list[1]["role"] == "patient"
        print(f"  [OK] GET /api/chat/sessions/{session_id_a}/messages -> {len(msgs_list)} turns retrieved")

        # 3. GET /api/patients/{patient_id}/ayush-history
        res_f3 = client.get(f"/api/patients/{patient_a_str}/ayush-history")
        assert res_f3.status_code == 200
        ayush_data = res_f3.json()
        assert ayush_data.get("ayush_history") is not None
        assert ayush_data["ayush_history"]["patient_id"] == patient_a_str
        print(f"  [OK] GET /api/patients/{patient_a_str}/ayush-history -> retrieved valid AYUSH history")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST G: Security (Cross-Patient Access Rejection)
        # ----------------------------------------------------
        print("\n[TEST G] Security: Cross-patient session access rejection...")
        # Patient B tries to send a message to Patient A's session
        res_g1 = client.post("/api/chat/message", json={
            "session_id": session_id_a,
            "patient_id": patient_b_str,  # Wrong patient!
            "message": "Trying to inject into Patient A's session!"
        })
        assert res_g1.status_code == 403, f"Expected 403, got {res_g1.status_code}"
        print("  [OK] Patient B forbidden from sending messages to Patient A's session (HTTP 403)")

        # Patient B tries to read Patient A's session messages
        res_g2 = client.get(f"/api/chat/sessions/{session_id_a}/messages?patient_id={patient_b_str}")
        assert res_g2.status_code == 403, f"Expected 403, got {res_g2.status_code}"
        print("  [OK] Patient B forbidden from reading Patient A's session messages (HTTP 403)")

        # Patient B tries to hijack Patient A's session on /start
        res_g3 = client.post("/api/chat/start", json={
            "patient_id": patient_b_str,
            "session_id": session_id_a,
            "mode": "ayush"
        })
        assert res_g3.status_code == 403, f"Expected 403, got {res_g3.status_code}"
        print("  [OK] Patient B forbidden from hijacking Patient A's session on /start (HTTP 403)")
        passed_tests += 1

        # ----------------------------------------------------
        # TEST H: Edge Cases & Error Handling
        # ----------------------------------------------------
        print("\n[TEST H] Edge cases & error handling...")
        # 1. Missing patient_id on /start
        res_h1 = client.post("/api/chat/start", json={"mode": "general"})
        assert res_h1.status_code == 400
        print("  [OK] Missing patient_id on /start -> HTTP 400")

        # 2. Invalid UUID format for patient_id
        res_h2 = client.post("/api/chat/start", json={"patient_id": "not-a-uuid"})
        assert res_h2.status_code == 400
        print("  [OK] Invalid patient_id format -> HTTP 400")

        # 3. Non-existent patient_id
        random_pat = str(uuid.uuid4())
        res_h3 = client.post("/api/chat/start", json={"patient_id": random_pat})
        assert res_h3.status_code == 404
        print("  [OK] Non-existent patient_id -> HTTP 404")

        # 4. Patient B has no AYUSH history -> clean null response (not 404 or 500)
        res_h4 = client.get(f"/api/patients/{patient_b_str}/ayush-history")
        assert res_h4.status_code == 200
        assert res_h4.json() == {"ayush_history": None}
        print("  [OK] Patient with no AYUSH history -> clean null response ({'ayush_history': None})")
        passed_tests += 1

    finally:
        # Non-destructive cleanup of test records
        with SessionLocal() as db:
            db.query(Patient).filter(Patient.id.in_([pat_a_id, pat_b_id])).delete(synchronize_session=False)
            db.commit()
        print("\n[CLEANUP] Cleaned up temporary test patients from PostgreSQL.")

    print("\n========================================================")
    print(f"RESULTS: {passed_tests} / {total_tests} BATCH 1 TESTS PASSED SUCCESSFULLY! [OK]")
    print("========================================================\n")


if __name__ == "__main__":
    run_batch1_tests()
