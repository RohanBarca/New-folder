"""
MedSync - AI Clinical Chatbot Service
--------------------------------------
Manages adaptive, conversational medical history-taking using Groq API (LLaMA models).
Supports General Medical Mode first, with an optional AYUSH History Mode (Dashavidha Pariksha).

FEATURES:
- Uses existing Groq API key and client pipeline.
- Enforces strict structured JSON output format.
- Adaptive questioning based on patient's symptoms & complaints.
- Prevents repeating information already present in patient details, OCR, or past answers.
- Detects red flag emergency symptoms.
- Maintains modular in-memory session state (General & AYUSH).
- Multilingual: language selection is centralized in config.py and applied by one
    language-aware clinical prompt for General and AYUSH modes.
"""

import json
import re
import uuid
import httpx
from typing import Dict, Any, Optional, List
from ..config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_API_URL,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    normalize_language_code,
)

NORMAL_QUESTION_LIMIT = 10
CHAT_CONTEXT_CHAR_LIMIT = 14000
CHAT_COMPLETION_TOKEN_LIMIT = 700

_QUESTION_INTENT_GROUPS = (
    {"chief", "concern", "problem", "reason", "today", "main"},
    {"when", "onset", "started", "duration", "long", "since"},
    {"symptom", "symptoms", "associated", "other", "along", "feel"},
    {"severity", "severe", "intensity", "bad", "worse", "better"},
    {"medication", "medications", "medicine", "medicines", "drug", "taking", "dose"},
    {"allergy", "allergies", "allergic", "reaction"},
    {"condition", "conditions", "disease", "illness", "health", "history"},
    {"surgery", "surgeries", "operation", "procedure"},
    {"family", "father", "mother", "parents", "hereditary", "relative"},
    {"smoke", "smoking", "alcohol", "lifestyle", "sleep", "routine"},
    {"diet", "food", "eating", "appetite", "exercise", "activity"},
    {"prakriti", "constitution", "climate", "warm", "cold"},
    {"agni", "digestion", "digestive", "hunger", "appetite"},
    {"vihara", "daily", "routine", "sleep", "exercise"},
    {"nidana", "trigger", "triggers", "cause", "causes"},
    {"samprapti", "progression", "developed", "changed", "evolution"},
)


def _normalise_words(value: Any) -> set[str]:
    """Return simple clinical intent words without depending on an NLP package."""
    return set(re.findall(r"[a-z0-9]+", str(value or "").lower()))


def _question_intent(value: Any) -> set[str]:
    words = _normalise_words(value)
    intent = set(words)
    for group in _QUESTION_INTENT_GROUPS:
        if words.intersection(group):
            intent.update(group)
    return intent


def _intent_groups(value: Any) -> set[int]:
    words = _normalise_words(value)
    return {
        index for index, group in enumerate(_QUESTION_INTENT_GROUPS)
        if words.intersection(group)
    }


def _is_semantic_duplicate(candidate: str, session: Dict[str, Any]) -> bool:
    """Detect repeated clinical intent across questions, answers, and extracted facts."""
    candidate_intent = _question_intent(candidate)
    candidate_words = _normalise_words(candidate)
    if not candidate_intent:
        return False

    prior_questions = [qa.get("question", "") for qa in session.get("questions_answers", [])]
    prior_questions.extend(
        turn.get("content", "")
        for turn in session.get("conversation_history", [])
        if turn.get("role") == "assistant"
    )
    prior_answers = [qa.get("answer", "") for qa in session.get("questions_answers", [])]
    known_facts = session.get("extracted_facts", {})
    prior_text = prior_questions + prior_answers + list(known_facts.keys()) + list(known_facts.values())

    for previous in prior_questions:
        previous_words = _normalise_words(previous)
        if candidate.strip().lower() == str(previous).strip().lower():
            return True
        candidate_groups = _intent_groups(candidate)
        previous_groups = _intent_groups(previous)
        if candidate_groups and candidate_groups.issubset(previous_groups):
            return True

    for known in prior_text[len(prior_questions):]:
        known_words = _normalise_words(known)
        if len(candidate_words & known_words) >= 2 and any(
            candidate_words.intersection(group) and known_words.intersection(group)
            for group in _QUESTION_INTENT_GROUPS
        ):
            return True
    return False


def _merge_extracted_facts(session: Dict[str, Any], facts: Any) -> None:
    if not isinstance(facts, dict):
        return
    existing = session.setdefault("extracted_facts", {})
    for key, value in facts.items():
        if value not in (None, "", [], {}):
            existing[str(key)] = value

# ─── LANGUAGE DIRECTIVES ──────────────────────────────────────────────────────
# Language-specific prompt fragments are intentionally not scattered by language.
def _get_language_directive(language: str) -> str:
    """Build the single language instruction used by every clinical mode."""
    language_name = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE])
    return (
        "LANGUAGE DIRECTIVE:\n"
        f"- CURRENT PATIENT LANGUAGE: {language_name} ({language})\n"
        "- Respond to the patient in the same language using natural, clear, empathetic, patient-friendly language.\n"
        "- Do not unnecessarily translate the patient's answer into English.\n"
        "- Do not switch language unless the patient switches language.\n"
        "- This language instruction never overrides clinical safety rules, red-flag detection, or the required JSON format."
    )


def _get_language_reminder(language: str) -> str:
    """
    Short reminder appended to every user prompt so the model never forgets
    the target language, even when the patient answers in a different language.
    """
    language_name = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE])
    return (
        "LANGUAGE REMINDER:\n"
        f"- CURRENT PATIENT LANGUAGE: {language_name} ({language})\n"
        "- Formulate the 'question' field naturally in the current patient language.\n"
        "- Extract clinical meaning accurately regardless of the language or script used in the answer."
    )


def _build_system_prompt(base_prompt: str, language: str) -> str:
    """
    Injects the correct language directive into a base system prompt.
    All language-switching logic lives here, not scattered across mode handlers.
    """
    directive = _get_language_directive(language)
    return f"{base_prompt}\n\n{directive}"


def _validate_language(language: Optional[str]) -> str:
    """Validates and normalises a language code. Falls back to DEFAULT_LANGUAGE."""
    normalized = normalize_language_code(language)
    return normalized if normalized in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE


def _compact_context(value: Any, max_chars: int = CHAT_CONTEXT_CHAR_LIMIT) -> str:
    """Bound prompt context while retaining both record headers and latest details."""
    text = str(value or "")
    if len(text) <= max_chars:
        return text
    head_size = max_chars // 2
    tail_size = max_chars - head_size
    return f"{text[:head_size]}\n...[context shortened]...\n{text[-tail_size:]}"

# ─── GENERAL MEDICAL MODE BASE SYSTEM PROMPT ──────────────────────────────────
# Language directive is injected at runtime via _build_system_prompt().
CHAT_GENERAL_SYSTEM_PROMPT = """You are MedSync AI, an empathetic, highly skilled medical history-taking assistant.

YOUR OBJECTIVE:
Collect the patient's medical history through an adaptive, conversational interview to prepare a structured report for their healthcare provider.

CLINICAL HISTORY SECTIONS TO COVER (ADAPTIVELY):
1. Chief Complaint (main health concern)
2. History of Present Illness (HPI - onset, duration, severity, location, radiation, triggering factors)
3. Past Medical History (pre-existing conditions, illnesses)
4. Past Surgical History (surgeries, procedures)
5. Drug / Medication History (current medications, dosages)
6. Allergy History (medication or food allergies)
7. Family History (hereditary conditions if relevant)
8. Personal History (smoking, alcohol, lifestyle if relevant)
9. Review of Systems (associated symptoms)

CRITICAL INSTRUCTIONS & RULES:
1. Ask EXACTLY ONE question at a time.
2. KEEP QUESTIONS PATIENT-FRIENDLY, simple, and easy to understand. Avoid medical jargon.
3. DO NOT REPEAT QUESTIONS. Check the provided patient details, OCR text, AI summary, and previous Q&A before asking. If information is already known, DO NOT ask it again unless clarifying.
4. ADAPT YOUR QUESTIONS dynamically based on what the patient says.
5. DO NOT DIAGNOSE, prescribe medications, or recommend treatments.
6. RED FLAG DETECTION: If the patient mentions potentially urgent/life-threatening symptoms (e.g. crushing chest pain / seene mein tez dard, acute severe dyspnea / saans lene mein bhari takleef, sudden weakness / stroke signs / achanak lakwa ya behoshi, severe bleeding / behadd khoon behna), set "red_flag": true. Hindi or Hinglish answers MUST NOT bypass red-flag detection.
7. COMPLETION: When sufficient history has been collected (usually after 4-8 targeted questions), set "complete": true and "question": null.
8. NORMAL QUESTION LIMIT: Stop at 10 questions. Exceed 10 only for clarification of invalid, unintelligible, or contradictory input; never ask extra questions just to fill an incomplete section.
9. INFORMATION DENSITY: Combine related clinical details into one natural question, and extract every distinct fact from each answer into the relevant sections. A detailed answer must suppress related follow-up questions.
10. INTERNAL CLINICAL DATA: Always extract and interpret clinical information in normalized English internally (e.g. {"chief_complaint": "abdominal pain", "duration": "3 days"}), regardless of whether the patient answered in English, Hindi, or Hinglish.

REQUIRED RESPONSE FORMAT:
You MUST respond with a valid JSON object in this exact JSON structure:
{
  "question": "Patient-friendly question string in the selected language (or null if complete)",
  "section": "Current clinical section (e.g. Chief Complaint, HPI, Past Medical History, Drug History, Allergy Check, or Complete)",
  "reason": "Internal clinical rationale for this step",
  "question_number": 1,
  "complete": false,
    "red_flag": false,
    "input_quality": "usable | invalid | unintelligible | contradictory",
    "clarification_required": false,
    "extracted_facts": {"normalized_fact_name": "patient-provided value"}
}"""

# ─── AYUSH / AYURVEDIC MODE BASE SYSTEM PROMPT ────────────────────────────────
# Language directive is injected at runtime via _build_system_prompt().
CHAT_AYUSH_SYSTEM_PROMPT = """You are MedSync AYUSH AI, a specialized Ayurvedic clinical history-taking assistant.

YOUR OBJECTIVE:
Collect the patient's Ayurvedic history according to the Dashavidha Pariksha framework and holistic parameters for review by an Ayurvedic practitioner.

AYUSH PARAMETERS TO COVER (ADAPTIVELY & CONVERSATIONALLY):
1. Prakriti (Physical & thermal constitution tendencies - e.g. climate comfort, skin/hair tendencies)
2. Vikriti (Current constitutional imbalance or disease state)
3. Sara (Tissue excellence & vitality)
4. Samhanana (Body compactness & build)
5. Pramana (Body measurements & proportions)
6. Satmya (Habituation & food tolerance / adaptability)
7. Sattva (Mental strength & temperament)
8. Ahara Shakti (Digestive power & Agni / appetite)
9. Vyayama Shakti (Exercise capacity & physical endurance)
10. Vaya (Age & life-stage factor)
11. Ahara (Dietary habits, food preferences, eating routine)
12. Vihara (Daily lifestyle routine, sleep quality, physical activity)
13. Nidana (Causative factors & triggers for current issue)
14. Samprapti (Progression & evolution of current symptoms)

CRITICAL INSTRUCTIONS & RULES:
1. Ask EXACTLY ONE question at a time.
2. KEEP QUESTIONS PATIENT-FRIENDLY. Do NOT assume the patient understands Sanskrit terms like Prakriti, Agni, or Vikriti. Ask clear plain questions in the selected language (e.g. in Hindi: 'क्या आप गर्म मौसम ज्यादा पसंद करते हैं या ठंडा?').
3. DO NOT DECLARE A DEFINITIVE PRAKRITI/VIKRITI DIAGNOSIS. Simply collect the patient's responses for practitioner review.
4. DO NOT DIAGNOSE, prescribe herbs, recommend Panchakarma, or suggest treatment.
5. DO NOT REPEAT QUESTIONS if information is already in patient details, OCR, or previous chat answers.
6. RED FLAG DETECTION: If severe acute symptoms (e.g. crushing chest pain, dyspnea, acute neurological deficit) are mentioned in English, Hindi, or Hinglish, set "red_flag": true.
7. COMPLETION: When key AYUSH parameters have been explored adaptively, set "complete": true and "question": null.
8. NORMAL QUESTION LIMIT: Stop at 10 questions. Exceed 10 only for clarification of invalid, unintelligible, or contradictory input; never ask extra questions just to fill every AYUSH parameter.
9. INFORMATION DENSITY: Combine related Dashavidha Pariksha, Ahara, and Vihara details into one natural question where appropriate, and extract every distinct fact from each answer. A detailed answer must suppress related follow-up questions.
10. INTERNAL CLINICAL DATA: Always extract and interpret clinical information in normalized English internally, regardless of the patient's answer language.

REQUIRED RESPONSE FORMAT:
You MUST respond with a valid JSON object in this exact JSON structure:
{
  "question": "Patient-friendly question string in the selected language (or null if complete)",
  "section": "AYUSH History",
  "ayush_parameter": "Prakriti | Vikriti | Sara | Samhanana | Pramana | Satmya | Sattva | Ahara Shakti | Vyayama Shakti | Vaya | Ahara | Vihara | Nidana | Samprapti | Complete",
  "reason": "Internal clinical rationale for this parameter",
  "question_number": 1,
  "complete": false,
    "red_flag": false,
    "input_quality": "usable | invalid | unintelligible | contradictory",
    "clarification_required": false,
    "extracted_facts": {"normalized_fact_name": "patient-provided value"}
}"""


def _get_candidate_models() -> List[str]:
    """Returns ordered list of models to attempt."""
    models = []
    if GROQ_MODEL:
        models.append(GROQ_MODEL)
    fallback_defaults = [
        "groq/compound-mini",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "qwen/qwen3.8-27b"
    ]
    for m in fallback_defaults:
        if m not in models:
            models.append(m)
    return models


def _check_api_key():
    """Validates that the Groq API key is present."""
    if not GROQ_API_KEY or GROQ_API_KEY == "PASTE_YOUR_GROQ_KEY_HERE":
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Please add your GROQ_API_KEY to backend/.env and restart the server."
        )


def _clean_json_string(raw: str) -> str:
    """Removes markdown code fences and cleans up raw JSON output."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()
    return cleaned


# ─── In-Memory Session Store ──────────────────────────────────────────────────
class SessionStore:
    """In-memory session manager. Modular so database persistence can be added later."""

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(self, context: Optional[Dict[str, Any]] = None) -> str:
        context = context or {}
        session_id = str(context.get("session_id") or uuid.uuid4())
        mode = context.get("mode", "general")
        language = _validate_language(context.get("language"))
        patient_id = context.get("patient_id")

        # Merge patient_details and patient_context if provided
        patient_details = context.get("patient_details") or context.get("patient_context") or {}

        self._sessions[session_id] = {
            "session_id": session_id,
            "patient_id": str(patient_id) if patient_id else None,
            "mode": mode,
            "language": language,
            "current_language": language,
            "patient_details": patient_details,
            "form_data": context.get("form_data", {}),
            "ocr_text": context.get("ocr_text", ""),
            "ai_summary": context.get("ai_summary", {}),
            "conversation_history": [],
            "questions_answers": [],
            "extracted_facts": {},
            "current_section": "AYUSH History" if mode == "ayush" else "Chief Complaint",
            "current_ayush_parameter": "Prakriti" if mode == "ayush" else None,
            "ayush_history": {
                "prakriti": None,
                "vikriti": None,
                "sara": None,
                "samhanana": None,
                "pramana": None,
                "satmya": None,
                "sattva": None,
                "ahara_shakti": None,
                "vyayama_shakti": None,
                "vaya": None,
                "ahara": None,
                "vihara": None,
                "nidana": None,
                "samprapti": None
            } if mode == "ayush" else None,
            "question_number": 1,
            "complete": False,
            "red_flag": False
        }
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if session_id in self._sessions:
            return self._sessions[session_id]

        # Hydrate from PostgreSQL database if not in memory (e.g. after restart or browser refresh)
        try:
            from ..database import get_engine, SessionLocal
            from ..models.chat_session import ChatSession
            from ..models.chat_message import ChatMessage
            from ..models.ayush_history import AyushHistory

            eng = get_engine()
            if eng and SessionLocal:
                with SessionLocal() as db:
                    uid = uuid.UUID(str(session_id))
                    cs = db.query(ChatSession).filter(ChatSession.id == uid).first()
                    if cs:
                        msgs = (
                            db.query(ChatMessage)
                            .filter(ChatMessage.session_id == uid)
                            .order_by(ChatMessage.created_at.asc())
                            .all()
                        )
                        conv_history = [{"role": m.role, "content": m.message_text} for m in msgs]
                        qa_pairs = []
                        last_q = ""
                        last_param = None
                        last_sec = "Chief Complaint"
                        last_q_num = 1
                        for m in msgs:
                            if m.role == "assistant":
                                last_q = m.message_text
                                last_sec = m.section or last_sec
                                last_param = m.ayush_parameter
                                if m.question_number:
                                    last_q_num = m.question_number
                            elif m.role == "patient" and last_q:
                                qa_pairs.append({
                                    "question": last_q,
                                    "answer": m.message_text,
                                    "section": m.section or last_sec,
                                    "ayush_parameter": m.ayush_parameter or last_param
                                })

                        ayush_rec = db.query(AyushHistory).filter(AyushHistory.session_id == uid).first()
                        ayush_data = ayush_rec.to_dict()["dashavidha_pariksha"] if ayush_rec else None

                        self._sessions[session_id] = {
                            "session_id": session_id,
                            "patient_id": str(cs.patient_id),
                            "mode": cs.mode,
                            "language": _validate_language(cs.language),
                            "current_language": _validate_language(cs.language),
                            "patient_details": cs.patient.to_dict() if cs.patient else {},
                            "form_data": {},
                            "ocr_text": "",
                            "ai_summary": {},
                            "conversation_history": conv_history,
                            "questions_answers": qa_pairs,
                            "extracted_facts": {},
                            "current_section": last_sec,
                            "current_ayush_parameter": last_param,
                            "ayush_history": ayush_data,
                            "question_number": last_q_num,
                            "complete": cs.status == "completed",
                            "red_flag": any(m.red_flag for m in msgs)
                        }
                        return self._sessions[session_id]
        except Exception:
            pass

        return None

    def update_session(self, session_id: str, updates: Dict[str, Any]):
        if session_id in self._sessions:
            self._sessions[session_id].update(updates)

    def update_language(self, session_id: str, language: str) -> bool:
        """
        Updates ONLY the language of an existing session mid-conversation.
        Preserves all history, Q&A pairs, clinical sections, and AYUSH data intact.
        Returns True if session found and updated, False otherwise.
        """
        session = self.get_session(session_id)
        if session is None:
            return False
        normalized = _validate_language(language)
        session["language"] = normalized
        session["current_language"] = normalized
        return True


# Global singleton store
session_store = SessionStore()


class ChatService:
    """Service for handling Groq AI history-taking chatbot logic."""

    @staticmethod
    async def start_chat(context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Starts a new AI clinical history-taking session or switches mode/language
        within an existing session without discarding collected history.
        """
        _check_api_key()
        context = context or {}
        mode = context.get("mode", "general")
        language = _validate_language(context.get("language"))
        existing_id = context.get("session_id")

        if existing_id and session_store.get_session(existing_id):
            # Reuse session (mode switch or language change) — preserve all history
            session_id = existing_id
            session = session_store.get_session(session_id)
            session["mode"] = mode
            session["language"] = language
            session["current_language"] = language
            session["complete"] = False
            
            p_details = context.get("patient_details") or context.get("patient_context")
            if p_details:
                session["patient_details"] = p_details
            if context.get("form_data"):
                session["form_data"] = context.get("form_data")
            if context.get("ocr_text"):
                session["ocr_text"] = context.get("ocr_text")
            if context.get("ai_summary"):
                session["ai_summary"] = context.get("ai_summary")

            if mode == "ayush" and not session.get("ayush_history"):
                session["ayush_history"] = {
                    "prakriti": None, "vikriti": None, "sara": None, "samhanana": None,
                    "pramana": None, "satmya": None, "sattva": None, "ahara_shakti": None,
                    "vyayama_shakti": None, "vaya": None, "ahara": None, "vihara": None,
                    "nidana": None, "samprapti": None
                }
        else:
            session_id = session_store.create_session(context)
            session = session_store.get_session(session_id)

        # Build language-aware system prompt
        base_prompt = CHAT_AYUSH_SYSTEM_PROMPT if mode == "ayush" else CHAT_GENERAL_SYSTEM_PROMPT
        system_prompt = _build_system_prompt(base_prompt, language)

        # Build initial background context for Groq
        bg_info = []
        if session["patient_details"]:
            bg_info.append(f"PATIENT DETAILS: {json.dumps(session['patient_details'])}")
        if session["form_data"]:
            bg_info.append(f"PATIENT FORM DATA: {json.dumps(session['form_data'])}")
        if session["ocr_text"]:
            bg_info.append(f"OCR EXTRACTED RECORDS:\n{session['ocr_text']}")
        if session["ai_summary"]:
            bg_info.append(f"EXISTING AI SUMMARY: {json.dumps(session['ai_summary'])}")
        if session["questions_answers"]:
            qa_text = "\n".join([f"Q: {qa['question']}\nA: {qa['answer']}" for qa in session["questions_answers"]])
            bg_info.append(f"GENERAL MEDICAL HISTORY ALREADY COLLECTED:\n{qa_text}")

        bg_text = "\n\n".join(bg_info) if bg_info else "No prior medical records provided."

        language_reminder = _get_language_reminder(language)

        if mode == "ayush":
            user_prompt = (
                f"MODE: AYUSH / AYURVEDIC HISTORY MODE\n"
                f"PATIENT CONTEXT & GENERAL MEDICAL HISTORY:\n{bg_text}\n\n"
                "INSTRUCTION: General medical history has been collected above. Now initiate the Ayurvedic clinical history (Dashavidha Pariksha). "
                "Check the background context so you DO NOT ask for information already provided. "
                f"Formulate Question 1 in JSON format to begin exploring the patient's constitutional tendencies (Prakriti, Agni, Ahara/Vihara).\n\n"
                f"{language_reminder}"
            )
        else:
            user_prompt = (
                f"MODE: GENERAL MEDICAL MODE\n"
                f"PATIENT CONTEXT & AVAILABLE RECORDS:\n{bg_text}\n\n"
                "INSTRUCTION: Initiate the general clinical history interview. Check background context so you DO NOT ask for information already present. "
                f"Formulate Question 1 in JSON format to ask the patient about their main health concern today.\n\n"
                f"{language_reminder}"
            )

        result = await ChatService._call_groq(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        # Localised fallback questions for when Groq call fails
        if language == "hi":
            default_general_q = "नमस्ते! आज आपकी मुख्य स्वास्थ्य समस्या क्या है?"
            default_ayush_q   = "अब हम आपका आयुर्वेदिक इतिहास लेंगे। क्या आप गर्म मौसम में अधिक आरामदायक महसूस करते हैं या ठंडे मौसम में?"
        else:
            default_general_q = "Hello! What is your main health concern today?"
            default_ayush_q   = "Now let's collect your Ayurvedic history. How would you describe your preference for warm vs cool climates?"

        if not result.get("success"):
            default_q = default_ayush_q if mode == "ayush" else default_general_q
            return {
                "success": True,
                "session_id": session_id,
                "mode": mode,
                "language": language,
                "question": default_q,
                "section": "AYUSH History" if mode == "ayush" else "Chief Complaint",
                "ayush_parameter": "Prakriti" if mode == "ayush" else None,
                "question_number": session.get("question_number", 1),
                "complete": False,
                "red_flag": False,
                "reason": "Fallback start"
            }

        data = result["data"]
        question = data.get("question") or (default_ayush_q if mode == "ayush" else default_general_q)
        section = data.get("section", "AYUSH History" if mode == "ayush" else "Chief Complaint")
        ayush_param = data.get("ayush_parameter", "Prakriti" if mode == "ayush" else None)
        q_num = session.get("question_number", 1)
        red_flag = bool(data.get("red_flag", False))
        complete = bool(data.get("complete", False))

        # Store in session
        session["conversation_history"].append({"role": "assistant", "content": question})
        session["current_section"] = section
        session["current_ayush_parameter"] = ayush_param
        session["question_number"] = q_num
        session["red_flag"] = red_flag
        session["complete"] = complete
        session_store.update_session(session_id, session)

        return {
            "success": True,
            "session_id": session_id,
            "mode": mode,
            "language": language,
            "question": question,
            "section": section,
            "ayush_parameter": ayush_param,
            "ayush_history": session.get("ayush_history"),
            "question_number": q_num,
            "complete": complete,
            "red_flag": red_flag,
            "new_red_flag": red_flag,
            "reason": data.get("reason", "")
        }

    @staticmethod
    async def send_message(session_id: str, patient_message: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Processes a patient's response, updates session state, and fetches the
        next question from Groq in the session's selected language.

        If `language` is provided (mid-conversation switch), the session language
        is updated in-place before generating the next question.
        """
        _check_api_key()
        session = session_store.get_session(session_id)

        if not session:
            return {
                "success": False,
                "error": "Session not found or expired. Please start a new interview."
            }

        # Mid-conversation language switch — preserves all session data
        if language:
            session_store.update_language(session_id, language)

        mode = session.get("mode", "general")
        session_language = session.get("current_language", session.get("language", DEFAULT_LANGUAGE))

        base_prompt = CHAT_AYUSH_SYSTEM_PROMPT if mode == "ayush" else CHAT_GENERAL_SYSTEM_PROMPT
        system_prompt = _build_system_prompt(base_prompt, session_language)

        if session.get("complete"):
            if mode == "ayush":
                completion_msg = (
                    "आपका आयुर्वेदिक इतिहास संग्रहीत किया जा चुका है। आपके चिकित्सक इसकी समीक्षा करेंगे।"
                    if session_language == "hi"
                    else "Your Ayurvedic history has been collected for review by your healthcare professional."
                )
            else:
                completion_msg = (
                    "आपका प्रारंभिक स्वास्थ्य इतिहास एकत्र किया जा चुका है।"
                    if session_language == "hi"
                    else "Your initial health history has been collected."
                )
            return {
                "success": True,
                "session_id": session_id,
                "mode": mode,
                "language": session_language,
                "question": None,
                "section": "Complete",
                "ayush_parameter": "Complete" if mode == "ayush" else None,
                "ayush_history": session.get("ayush_history"),
                "question_number": session.get("question_number", 6),
                "complete": True,
                "red_flag": session.get("red_flag", False),
                "message": completion_msg
            }

        # Record patient response
        last_question = session["conversation_history"][-1]["content"] if session["conversation_history"] else ""
        last_param = session.get("current_ayush_parameter")
        
        session["conversation_history"].append({"role": "user", "content": patient_message})
        session["questions_answers"].append({
            "question": last_question,
            "answer": patient_message,
            "section": session.get("current_section", ""),
            "ayush_parameter": last_param
        })

        # Update structured AYUSH parameter dictionary if in AYUSH mode
        if mode == "ayush" and last_param:
            param_key = last_param.lower().replace(" ", "_")
            if session["ayush_history"] and param_key in session["ayush_history"]:
                session["ayush_history"][param_key] = patient_message

        # Build prompt payload with full history
        bg_info = []
        if session["patient_details"]:
            bg_info.append(f"PATIENT DETAILS: {json.dumps(session['patient_details'])}")
        if session["form_data"]:
            bg_info.append(f"PATIENT FORM DATA: {json.dumps(session['form_data'])}")
        if session["ocr_text"]:
            bg_info.append(f"OCR RECORDS:\n{session['ocr_text']}")
        if session["ai_summary"]:
            bg_info.append(f"AI SUMMARY: {json.dumps(session['ai_summary'])}")

        bg_text = _compact_context("\n\n".join(bg_info)) if bg_info else "No prior records."

        history_snippets = _compact_context("\n".join([
            f"AI [{qa.get('ayush_parameter') or qa['section']}]: {qa['question']}\nPatient: {qa['answer']}"
            for qa in session["questions_answers"]
        ]), max_chars=7000)

        language_reminder = _get_language_reminder(session_language)

        user_prompt = (
            f"MODE: {mode.upper()}\n"
            f"BACKGROUND CONTEXT:\n{bg_text}\n\n"
            f"INTERVIEW HISTORY SO FAR:\n{history_snippets}\n\n"
            f"EXTRACTED FACTS SO FAR (do not ask for these again): {_compact_context(json.dumps(session.get('extracted_facts', {})), 3000)}\n\n"
            f"LATEST PATIENT ANSWER: \"{_compact_context(patient_message, 2500)}\"\n\n"
            "INSTRUCTION:\n"
            "1. Evaluate if a RED FLAG urgent symptom was mentioned (set red_flag=true if urgent).\n"
            "2. Extract every distinct clinical fact from the latest answer into extracted_facts, including facts belonging to different sections (for example condition, medication, and family history).\n"
            "3. Mark input_quality invalid, unintelligible, or contradictory and set clarification_required=true only when the latest answer cannot be safely used.\n"
            "4. Determine if sufficient history has been collected across parameters. If complete, set complete=true and question=null.\n"
            "5. Before proposing a question, compare its clinical intent with every prior question, patient answer, and extracted fact. Ask only for the highest-priority missing information, combining related items naturally.\n"
            f"6. Normal interview limit is {NORMAL_QUESTION_LIMIT} questions. At question {NORMAL_QUESTION_LIMIT}, complete unless clarification_required=true. A question after the limit is allowed only for that clarification and must be marked clarification_required=true.\n\n"
            f"{language_reminder}"
        )

        groq_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        result = await ChatService._call_groq(
            system_prompt=system_prompt,
            messages=groq_messages
        )

        if not result.get("success"):
            return {
                "success": False,
                "error": result.get("error", "I'm having trouble processing that. Please try again.")
            }

        data = result["data"]
        _merge_extracted_facts(session, data.get("extracted_facts"))
        complete = bool(data.get("complete", False))
        question = data.get("question") if not complete else None
        section = data.get("section", session.get("current_section", "AYUSH History" if mode == "ayush" else "HPI"))
        ayush_param = data.get("ayush_parameter", session.get("current_ayush_parameter")) if mode == "ayush" else None
        red_flag = bool(data.get("red_flag", False)) or bool(session.get("red_flag", False))
        new_red_flag = bool(data.get("red_flag", False))
        next_q_num = session["question_number"] + 1

        input_quality = str(data.get("input_quality", "usable")).lower()
        clarification_required = bool(data.get("clarification_required", False)) and input_quality in {
            "invalid", "unintelligible", "contradictory"
        }
        if session["question_number"] >= NORMAL_QUESTION_LIMIT and not clarification_required:
            complete = True
            question = None
            next_q_num = session["question_number"]
        elif question and _is_semantic_duplicate(question, session):
            complete = True
            question = None

        if question:
            session["conversation_history"].append({"role": "assistant", "content": question})

        session["current_section"] = section
        session["current_ayush_parameter"] = ayush_param
        session["question_number"] = next_q_num
        session["complete"] = complete
        session["red_flag"] = red_flag
        session_store.update_session(session_id, session)

        if complete:
            if mode == "ayush":
                completion_msg = (
                    "आपका आयुर्वेदिक इतिहास संग्रहीत किया जा चुका है। आपके चिकित्सक इसकी समीक्षा करेंगे।"
                    if session_language == "hi"
                    else "Your Ayurvedic history has been collected for review by your healthcare professional."
                )
            else:
                completion_msg = (
                    "आपका प्रारंभिक स्वास्थ्य इतिहास एकत्र किया जा चुका है।"
                    if session_language == "hi"
                    else "Your initial health history has been collected."
                )
            return {
                "success": True,
                "session_id": session_id,
                "mode": mode,
                "language": session_language,
                "question": None,
                "section": "Complete",
                "ayush_parameter": "Complete" if mode == "ayush" else None,
                "ayush_history": session.get("ayush_history"),
                "question_number": next_q_num,
                "complete": True,
                "red_flag": red_flag,
                "new_red_flag": new_red_flag,
                "message": completion_msg,
                "reason": data.get("reason", "Required history collected.")
            }

        return {
            "success": True,
            "session_id": session_id,
            "mode": mode,
            "language": session_language,
            "question": question,
            "section": section,
            "ayush_parameter": ayush_param,
            "ayush_history": session.get("ayush_history"),
            "question_number": next_q_num,
            "complete": complete,
            "red_flag": red_flag,
            "new_red_flag": new_red_flag,
            "reason": data.get("reason", "")
        }

    @staticmethod
    async def _call_groq(system_prompt: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Calls Groq API using candidate models fallback mechanism."""
        candidate_models = _get_candidate_models()
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        last_error = "Groq call failed."

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model in candidate_models:
                payload = {
                    "model": model,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                    "max_tokens": CHAT_COMPLETION_TOKEN_LIMIT
                }

                try:
                    response = await client.post(GROQ_API_URL, headers=headers, json=payload)
                    if response.status_code == 200:
                        raw = response.json()["choices"][0]["message"]["content"]
                        cleaned = _clean_json_string(raw)
                        parsed = json.loads(cleaned)
                        return {"success": True, "data": parsed, "model": model}
                    elif response.status_code == 404:
                        last_error = f"Model {model} not found."
                        continue
                    else:
                        last_error = f"Groq HTTP {response.status_code}: {response.text}"
                except json.JSONDecodeError:
                    last_error = "Failed to parse JSON response from Groq."
                except httpx.TimeoutException:
                    last_error = "Request to Groq API timed out."
                except Exception as e:
                    last_error = str(e)

        return {"success": False, "error": last_error}
