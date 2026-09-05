"""Focused regression tests for adaptive clinical question selection."""

import asyncio
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.services import chat_service
from app.services.chat_service import ChatService, session_store


def _run_with_responses(responses, callback):
    original_key = chat_service.GROQ_API_KEY
    original_call = ChatService._call_groq
    pending = list(responses)

    async def fake_call(*args, **kwargs):
        return {"success": True, "data": pending.pop(0)}

    chat_service.GROQ_API_KEY = "test-key"
    ChatService._call_groq = staticmethod(fake_call)
    try:
        return asyncio.run(callback())
    finally:
        chat_service.GROQ_API_KEY = original_key
        ChatService._call_groq = original_call


def _start_response(question="What brings you in today?", **extra):
    return {
        "question": question,
        "section": "Chief Complaint",
        "question_number": 1,
        "complete": False,
        **extra,
    }


def test_detailed_answer_extracts_multiple_facts_and_skips_related_question():
    async def scenario():
        started = await ChatService.start_chat({"language": "en"})
        response = await ChatService.send_message(
            started["session_id"],
            "I have diabetes, take metformin, and my father also had diabetes.",
        )
        session = session_store.get_session(started["session_id"])
        assert response["complete"] is True
        assert response["question"] is None
        assert session["extracted_facts"]["condition"] == "diabetes"
        assert session["extracted_facts"]["medication"] == "metformin"
        assert session["extracted_facts"]["family_history"] == "father had diabetes"

    _run_with_responses([
        _start_response(),
        {
            "question": "What is your family medical history?",
            "section": "Family History",
            "complete": False,
            "extracted_facts": {
                "condition": "diabetes",
                "medication": "metformin",
                "family_history": "father had diabetes",
            },
        },
    ], scenario)


def test_semantic_duplicate_is_not_returned():
    async def scenario():
        started = await ChatService.start_chat({"language": "en"})
        response = await ChatService.send_message(started["session_id"], "I have a cough.")
        assert response["complete"] is True
        assert response["question"] is None

    _run_with_responses([
        _start_response("What medicines are you taking?"),
        {"question": "Which medications do you currently use?", "complete": False},
    ], scenario)


def test_normal_interview_stops_at_ten_questions():
    responses = [_start_response()]
    responses.extend(
        {"question": f"Question {number}", "complete": False}
        for number in range(2, 12)
    )

    async def scenario():
        started = await ChatService.start_chat({"language": "en"})
        session_id = started["session_id"]
        response = None
        for number in range(2, 11):
            response = await ChatService.send_message(session_id, f"Answer {number}")
            assert response["question_number"] == number
        response = await ChatService.send_message(session_id, "Final usable answer")
        assert response["complete"] is True
        assert response["question"] is None
        assert response["question_number"] == 10

    _run_with_responses(responses, scenario)


def test_invalid_answer_allows_only_clarification_question_eleven():
    responses = [_start_response()]
    responses.extend(
        {"question": f"Question {number}", "complete": False}
        for number in range(2, 11)
    )
    responses.append({
        "question": "Please clarify the symptom duration.",
        "complete": False,
        "input_quality": "unintelligible",
        "clarification_required": True,
    })

    async def scenario():
        started = await ChatService.start_chat({"language": "en"})
        session_id = started["session_id"]
        for number in range(2, 11):
            await ChatService.send_message(session_id, f"Answer {number}")
        response = await ChatService.send_message(session_id, "I do not understand the question")
        assert response["complete"] is False
        assert response["question_number"] == 11
        assert response["question"] is not None

    _run_with_responses(responses, scenario)


def test_ayush_and_language_state_are_preserved_with_early_completion():
    async def scenario():
        started = await ChatService.start_chat({"mode": "ayush", "language": "hi"})
        session_id = started["session_id"]
        response = await ChatService.send_message(session_id, "मुझे गर्मी पसंद है और मेरी नींद ठीक है।")
        session_store.update_language(session_id, "en")
        assert response["success"] is True
        assert session_store.get_session(session_id)["mode"] == "ayush"
        assert session_store.get_session(session_id)["current_language"] == "en"

    _run_with_responses([
        _start_response("क्या आपको गर्म मौसम पसंद है या ठंडा मौसम?", section="AYUSH History", ayush_parameter="Prakriti"),
        {
            "question": None,
            "section": "Complete",
            "ayush_parameter": "Complete",
            "complete": True,
            "extracted_facts": {"climate_preference": "warm", "sleep": "adequate"},
        },
    ], scenario)


def test_red_flag_is_sticky_for_safety_but_not_marked_on_later_questions():
    async def scenario():
        started = await ChatService.start_chat({"language": "en"})
        session_id = started["session_id"]
        first = await ChatService.send_message(session_id, "I have crushing chest pain and severe shortness of breath.")
        second = await ChatService.send_message(session_id, "It started this morning.")
        assert first["red_flag"] is True
        assert first["new_red_flag"] is True
        assert second["red_flag"] is True
        assert second["new_red_flag"] is False

    _run_with_responses([
        _start_response(),
        {"question": "Are you taking any medicines?", "complete": False, "red_flag": True},
        {"question": "Do you have any allergies?", "complete": False, "red_flag": False},
    ], scenario)