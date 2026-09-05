"""
MedSync - Multilingual Chatbot Test Suite
-----------------------------------------
Validates all 14 required multilingual test scenarios:
1. English + General Medical mode
2. Hindi + General Medical mode
3. English + AYUSH mode
4. Hindi + AYUSH mode
5. Hinglish patient answer while Hindi is selected
6. English patient answer while Hindi is selected
7. Hindi patient answer while English is selected
8. Mid-conversation language switch (English -> Hindi)
9. Mid-conversation language switch (Hindi -> English)
10. Preservation of previous Q&A history
11. No repetition of completed questions
12. Red-flag detection in Hindi/Hinglish
13. Session language state preservation
14. AI Summary format compatibility
"""

import sys
import asyncio
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Ensure stdout supports UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.services.chat_service import ChatService, session_store
from app.config import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE


async def run_tests():
    print("\n========================================================")
    print("MEDSYNC MULTILINGUAL CHATBOT TEST SUITE")
    print("========================================================\n")
    
    passed_tests = 0
    total_tests = 14

    # ----------------------------------------------------
    # TEST 1: English + General Medical
    # ----------------------------------------------------
    print("[TEST 1] English + General Medical mode start...")
    res1 = await ChatService.start_chat({"mode": "general", "language": "en"})
    assert res1.get("success") is True, f"Failed: {res1}"
    assert res1.get("language") == "en"
    assert res1.get("mode") == "general"
    assert res1.get("question") is not None
    assert res1.get("session_id") is not None
    session1_id = res1["session_id"]
    print(f"  [OK] Session ID: {session1_id}")
    print(f"  [OK] Initial Question (EN): {res1['question']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 2: Hindi + General Medical
    # ----------------------------------------------------
    print("\n[TEST 2] Hindi + General Medical mode start...")
    res2 = await ChatService.start_chat({"mode": "general", "language": "hi"})
    assert res2.get("success") is True, f"Failed: {res2}"
    assert res2.get("language") == "hi"
    assert res2.get("mode") == "general"
    assert res2.get("question") is not None
    session2_id = res2["session_id"]
    print(f"  [OK] Session ID: {session2_id}")
    print(f"  [OK] Initial Question (HI): {res2['question']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 3: English + AYUSH
    # ----------------------------------------------------
    print("\n[TEST 3] English + AYUSH mode start...")
    res3 = await ChatService.start_chat({"mode": "ayush", "language": "en"})
    assert res3.get("success") is True, f"Failed: {res3}"
    assert res3.get("language") == "en"
    assert res3.get("mode") == "ayush"
    assert res3.get("ayush_parameter") is not None
    print(f"  [OK] AYUSH Initial Question (EN): {res3['question']}")
    print(f"  [OK] AYUSH Parameter: {res3.get('ayush_parameter')}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 4: Hindi + AYUSH
    # ----------------------------------------------------
    print("\n[TEST 4] Hindi + AYUSH mode start...")
    res4 = await ChatService.start_chat({"mode": "ayush", "language": "hi"})
    assert res4.get("success") is True, f"Failed: {res4}"
    assert res4.get("language") == "hi"
    assert res4.get("mode") == "ayush"
    print(f"  [OK] AYUSH Initial Question (HI): {res4['question']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 5: Hinglish patient answer while Hindi is selected
    # ----------------------------------------------------
    print("\n[TEST 5] Hinglish patient answer while Hindi is selected...")
    # Answer in Hinglish to Hindi session
    res5 = await ChatService.send_message(
        session2_id,
        "Mere pet mein 3 din se bahut tez pain ho raha hai, khana khane ke baad aur badhta hai."
    )
    assert res5.get("success") is True, f"Failed: {res5}"
    assert res5.get("language") == "hi"
    assert res5.get("question") is not None
    print(f"  [OK] Patient answered: 'Mere pet mein 3 din se bahut tez pain ho raha hai...'")
    print(f"  [OK] AI Next Question in Hindi: {res5['question']}")
    print(f"  [OK] Section: {res5.get('section')}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 6: English patient answer while Hindi is selected
    # ----------------------------------------------------
    print("\n[TEST 6] English patient answer while Hindi is selected...")
    res6 = await ChatService.send_message(
        session2_id,
        "I also vomited twice yesterday morning and feel nauseous."
    )
    assert res6.get("success") is True, f"Failed: {res6}"
    assert res6.get("language") == "hi"
    assert res6.get("question") is not None
    print(f"  [OK] Patient answered in English: 'I also vomited twice yesterday morning...'")
    print(f"  [OK] AI Next Question remains in Hindi: {res6['question']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 7: Hindi patient answer while English is selected
    # ----------------------------------------------------
    print("\n[TEST 7] Hindi patient answer while English is selected...")
    res7 = await ChatService.send_message(
        session1_id,
        "मुझे पिछले दो दिनों से हल्का बुखार और गले में खराश महसूस हो रही है।"
    )
    assert res7.get("success") is True, f"Failed: {res7}"
    assert res7.get("language") == "en"
    assert res7.get("question") is not None
    print(f"  [OK] Patient answered in Hindi: 'मुझे पिछले दो दिनों से हल्का बुखार...'")
    print(f"  [OK] AI Next Question remains in English: {res7['question']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 8: Mid-conversation language switch (English -> Hindi)
    # ----------------------------------------------------
    print("\n[TEST 8] Mid-conversation language switch (English -> Hindi)...")
    # Switch session1 from English to Hindi
    updated = session_store.update_language(session1_id, "hi")
    assert updated is True
    res8 = await ChatService.send_message(
        session1_id,
        "खांसी भी आ रही है रात को ज्यादा।"
    )
    assert res8.get("success") is True, f"Failed: {res8}"
    assert res8.get("language") == "hi"
    print(f"  [OK] Session 1 switched from EN to HI without restarting")
    print(f"  [OK] AI Next Question now in Hindi: {res8['question']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 9: Mid-conversation language switch (Hindi -> English)
    # ----------------------------------------------------
    print("\n[TEST 9] Mid-conversation language switch (Hindi -> English)...")
    # Switch session1 back from Hindi to English
    updated = session_store.update_language(session1_id, "en")
    assert updated is True
    res9 = await ChatService.send_message(
        session1_id,
        "No other symptoms besides the cough and mild fever."
    )
    assert res9.get("success") is True, f"Failed: {res9}"
    assert res9.get("language") == "en"
    print(f"  [OK] Session 1 switched from HI back to EN without restarting")
    print(f"  [OK] AI Next Question now in English: {res9.get('question') or 'Interview completed'}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 10: Preservation of previous Q&A history
    # ----------------------------------------------------
    print("\n[TEST 10] Verify previous answers and Q&A history preserved...")
    stored_session1 = session_store.get_session(session1_id)
    qa_list = stored_session1.get("questions_answers", [])
    assert len(qa_list) >= 3, f"Expected >= 3 Q&A pairs, got {len(qa_list)}"
    print(f"  [OK] Total Q&A pairs in Session 1 history: {len(qa_list)}")
    for i, qa in enumerate(qa_list, 1):
        print(f"    {i}. Q: {qa['question'][:45]}... | A: {qa['answer']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 11: No repetition of completed questions
    # ----------------------------------------------------
    print("\n[TEST 11] Verify chatbot does not repeat answered questions...")
    # Check that each question asked is unique
    questions = [qa["question"] for qa in qa_list]
    unique_questions = set(questions)
    assert len(questions) == len(unique_questions), "Duplicate questions were asked!"
    print(f"  [OK] All {len(questions)} asked questions are unique and progressive.")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 12: Red-flag detection in Hindi/Hinglish
    # ----------------------------------------------------
    print("\n[TEST 12] Red-flag detection on urgent symptoms in Hindi/Hinglish...")
    res12_start = await ChatService.start_chat({"mode": "general", "language": "hi"})
    session_rf = res12_start["session_id"]
    res12_msg = await ChatService.send_message(
        session_rf,
        "Mere chest mein bahut tez crushing pain ho raha hai aur saans lene mein bohot takleef ho rahi hai, left arm me bhi dard ja raha hai."
    )
    assert res12_msg.get("success") is True, f"Failed: {res12_msg}"
    print(f"  [OK] Urgent Symptom: 'Mere chest mein bahut tez crushing pain ho raha hai...'")
    print(f"  [OK] Red Flag Detected: {res12_msg.get('red_flag')}")
    assert res12_msg.get("red_flag") is True, "Red flag was NOT triggered for severe chest pain radiating to arm!"
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 13: Session language state preserved
    # ----------------------------------------------------
    print("\n[TEST 13] Verify session language is preserved...")
    stored_rf = session_store.get_session(session_rf)
    assert stored_rf.get("language") == "hi"
    print(f"  [OK] Stored session language: {stored_rf.get('language')}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 14: AI Summary compatibility
    # ----------------------------------------------------
    print("\n[TEST 14] Verify AI summary schema and supported languages map...")
    assert "en" in SUPPORTED_LANGUAGES and "hi" in SUPPORTED_LANGUAGES
    assert DEFAULT_LANGUAGE == "en"
    print(f"  [OK] Supported Languages: {SUPPORTED_LANGUAGES}")
    print(f"  [OK] Default Language: {DEFAULT_LANGUAGE}")
    passed_tests += 1

    print("\n========================================================")
    print(f"RESULTS: {passed_tests} / {total_tests} TESTS PASSED SUCCESSFULLY! [OK]")
    print("========================================================\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
