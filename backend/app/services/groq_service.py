"""
MedSync - Groq AI Service
---------------------------
Handles all interactions with the Groq API (OpenAI-compatible) from the FastAPI backend.

SECURITY:
  - API key is loaded exclusively from the environment variable GROQ_API_KEY.
  - This module is NEVER imported by any frontend/React code.
  - The API key is NEVER serialized into API responses or exposed to the client.
"""

import json
import re
import httpx
from typing import Dict, Any, List
from ..config import GROQ_API_KEY, GROQ_MODEL, GROQ_API_URL

SUMMARY_INPUT_CHAR_LIMIT = 12000
SUMMARY_COMPLETION_TOKEN_LIMIT = 1200

SYSTEM_INSTRUCTION = (
    "You are a medical record summarization assistant. Summarize the following patient information "
    "for a healthcare professional. Do not diagnose the patient, prescribe medication, or invent information. "
    "Only summarize information provided in the records."
)

JSON_SCHEMA_PROMPT = """
You must return your response as a valid, structured JSON object with EXACTLY the following keys:
{
  "patient_overview": "Concise overview of the patient and context",
  "current_complaint": "Current presenting symptoms or reasons for visit (or 'Not specified' if absent)",
  "relevant_medical_history": "Summary of relevant past medical history found in the records",
  "previous_diagnoses": ["List of identified diagnoses/conditions"],
  "previous_medications": [
    {
      "name": "Medication name",
      "dosage": "Dosage (e.g., 500mg)",
      "frequency": "Frequency (e.g., twice daily)",
      "duration": "Duration (e.g., 5 days)"
    }
  ],
  "important_observations": ["List of notable clinical observations or vital remarks"],
  "timeline_of_previous_visits": [
    {
      "date": "Visit date or period",
      "event": "Description of visit/treatment"
    }
  ],
  "document_type": "OPD Prescription | Lab Report | Discharge Summary | Medical History | Other",
  "patient": {
    "name": null,
    "age": null,
    "gender": null,
    "patient_id": null
  },
  "doctor": {
    "name": null,
    "specialization": null,
    "hospital": null,
    "date": null
  },
  "vitals": {
    "blood_pressure": null,
    "pulse": null,
    "temperature": null,
    "weight": null,
    "spo2": null,
    "blood_sugar": null
  },
  "lab_results": [
    {
      "test": "",
      "value": "",
      "unit": "",
      "reference_range": ""
    }
  ],
  "clinical_notes": null,
  "follow_up": null,
  "ai_summary": "A 2-3 sentence executive summary for the healthcare provider."
}

RULES:
- Only summarize what is explicitly provided. Do not fabricate any information.
- Return ONLY the JSON object, without any markdown formatting or explanations.
"""

def _get_candidate_models() -> List[str]:
    """Returns an ordered list of models to attempt."""
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


def _compact_records(records_text: str, max_chars: int = SUMMARY_INPUT_CHAR_LIMIT) -> str:
    """Keep summarization requests within the configured Groq token budget."""
    text = records_text.strip()
    if len(text) <= max_chars:
        return text
    head_size = max_chars // 2
    tail_size = max_chars - head_size
    return f"{text[:head_size]}\n...[records shortened]...\n{text[-tail_size:]}"


def _normalize_summary(summary: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures standard structure and field types for the frontend."""
    # Ensure patient_overview exists
    if not summary.get("patient_overview"):
        summary["patient_overview"] = summary.get("ai_summary", "No patient overview available.")

    # Ensure ai_summary exists
    if not summary.get("ai_summary"):
        summary["ai_summary"] = summary.get("patient_overview", "")

    # Ensure diagnoses list
    if "previous_diagnoses" in summary and "diagnoses" not in summary:
        summary["diagnoses"] = summary["previous_diagnoses"]
    elif "diagnoses" in summary and "previous_diagnoses" not in summary:
        summary["previous_diagnoses"] = summary["diagnoses"]

    if not isinstance(summary.get("previous_diagnoses"), list):
        summary["previous_diagnoses"] = [str(summary["previous_diagnoses"])] if summary.get("previous_diagnoses") else []
    summary["diagnoses"] = summary["previous_diagnoses"]

    # Ensure medications list
    if "previous_medications" in summary and "medications" not in summary:
        summary["medications"] = summary["previous_medications"]
    elif "medications" in summary and "previous_medications" not in summary:
        summary["previous_medications"] = summary["medications"]

    normalized_meds = []
    for med in summary.get("previous_medications", []):
        if isinstance(med, dict):
            normalized_meds.append({
                "name": med.get("name", ""),
                "dosage": med.get("dosage", ""),
                "frequency": med.get("frequency", ""),
                "duration": med.get("duration", "")
            })
        elif isinstance(med, str) and med.strip():
            normalized_meds.append({
                "name": med.strip(),
                "dosage": "",
                "frequency": "",
                "duration": ""
            })
    summary["previous_medications"] = normalized_meds
    summary["medications"] = normalized_meds

    # Ensure observations list
    if not isinstance(summary.get("important_observations"), list):
        obs = summary.get("important_observations")
        summary["important_observations"] = [str(obs)] if obs else []

    # Ensure timeline list
    if not isinstance(summary.get("timeline_of_previous_visits"), list):
        tl = summary.get("timeline_of_previous_visits")
        summary["timeline_of_previous_visits"] = [tl] if isinstance(tl, dict) else []

    return summary






# ──────────────────────────────────────────────────────────────────────────────
# Batch 2: Final Patient Summary Engine — System Prompt & Schema
# ──────────────────────────────────────────────────────────────────────────────

FINAL_SUMMARY_SYSTEM_PROMPT = """You are a clinical documentation assistant working within a healthcare information system.

Your ONLY task is to organize and summarize information EXPLICITLY PROVIDED in the patient records supplied to you.

MANDATORY RULES — you must follow ALL of these without exception:

1. Use ONLY the supplied patient data. Never invent symptoms, diagnoses, medications, allergies, laboratory values, vital signs, dates, or any other clinical information.

2. You are NOT a diagnosing physician. Do NOT make diagnoses.

3. Do NOT prescribe medication. Do NOT recommend treatment. Do NOT recommend Ayurvedic remedies, Panchakarma, diet therapy, herbal treatment, or lifestyle changes.

4. If information is missing from the supplied data, explicitly state "Not available" or "Not recorded in available records."

5. If information is uncertain, clearly mark it as uncertain. If sources conflict, DO NOT silently choose one — flag the conflict explicitly in the uncertain_or_conflicting_information array.

6. For AYUSH information: report ONLY what the patient provided/recorded. Never independently state the patient's Prakriti or Vikriti — only report what was patient-reported or explicitly recorded.

7. For OCR-derived information: if the OCR text is unclear, fragmentary, or contains obvious errors (broken tables, garbled text), place that information in uncertain_or_conflicting_information and note the source document. Do NOT convert uncertain OCR into definitive clinical facts.

8. Red flags: include ONLY red flags explicitly present in the supplied data (chatbot red_flag=true markers, or explicit urgent findings in documents). Do NOT invent or infer red flags.

9. Source traceability: for every important finding, record its source (patient_profile, chatbot, medical_document, ocr, ayush_history) and the specific document filename where applicable.

10. The summary must clearly communicate that it is AI-generated and requires physician verification.

Return ONLY the JSON object with no markdown formatting, no code fences, no explanatory text outside the JSON."""

FINAL_SUMMARY_JSON_SCHEMA = """\
You MUST return a single valid JSON object with EXACTLY these keys and types.
Fill only from the supplied patient data. Use null for unavailable fields, empty arrays [] for empty lists.

{
  "patient_overview": {
    "name": "string or null",
    "age": "integer or null",
    "gender": "string or null",
    "language": "string or null",
    "abha_address": "string or null"
  },

  "chief_complaint": "string — patient's stated primary reason, from chatbot/records, or 'Not available'",

  "history_of_present_illness": "string — detailed narrative from records/chatbot, or 'Not available'",

  "symptoms": ["list of symptom strings explicitly reported/documented"],

  "past_medical_history": ["list of past conditions/diagnoses from records"],

  "past_surgical_history": ["list of surgical procedures from records"],

  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage or null",
      "frequency": "frequency or null",
      "duration": "duration or null",
      "source": "source of this medication information"
    }
  ],

  "allergies": ["list of documented allergies, or ['No known allergies documented'] if explicitly stated"],

  "family_history": "string from records, or 'Not available'",

  "personal_history": "string from records (lifestyle, occupation, habits), or 'Not available'",

  "review_of_systems": {
    "system_name": "findings for that system, from records only"
  },

  "vitals": [
    {
      "parameter": "e.g. Blood Pressure",
      "value": "recorded value",
      "source": "source document or chatbot"
    }
  ],

  "investigations": ["list of investigations ordered or reported in records"],

  "laboratory_findings": [
    {
      "test": "test name",
      "value": "result value",
      "unit": "unit or null",
      "reference_range": "reference range or null",
      "source": "document filename or null"
    }
  ],

  "diagnoses_mentioned_in_records": ["diagnoses explicitly stated in records — NOT AI-derived diagnoses"],

  "procedures": ["procedures documented in records"],

  "important_findings": ["clinically significant findings explicitly in the data"],

  "red_flags": [
    {
      "finding": "exact red flag description from source data",
      "type": "documented_red_flag | patient_reported_concern",
      "source": "chatbot | medical_document | ocr"
    }
  ],

  "ayush_history": {
    "prakriti": "patient-reported only, or null",
    "vikriti": "patient-reported only, or null",
    "sara": "patient-reported only, or null",
    "samhanana": "patient-reported only, or null",
    "pramana": "patient-reported only, or null",
    "satmya": "patient-reported only, or null",
    "sattva": "patient-reported only, or null",
    "ahara_shakti": "patient-reported only, or null",
    "vyayama_shakti": "patient-reported only, or null",
    "vaya": "patient-reported only, or null",
    "ahara": "patient-reported only, or null",
    "vihara": "patient-reported only, or null",
    "nidana": "patient-reported only, or null",
    "samprapti": "patient-reported only, or null"
  },

  "uncertain_or_conflicting_information": ["list of conflicts or OCR uncertainties with source references"],

  "missing_information": ["list of clinically important fields not available in records"],

  "questions_for_physician": ["questions flagged for physician to resolve based on gaps or conflicts"],

  "source_traceability": [
    {
      "finding": "description of finding",
      "source": "patient_profile | chatbot | medical_document | ocr | ayush_history",
      "document_filename": "filename if from document/OCR, or null",
      "section": "which section of the summary this contributed to"
    }
  ],

  "clinical_summary": "2–4 sentence executive summary for the attending physician, based ONLY on available data. Must NOT contain diagnoses or treatment recommendations. Must state that physician verification is required."
}

RULES:
- Return ONLY the JSON object above.
- Do NOT add any keys not listed above.
- Do NOT wrap in markdown code fences.
- If a field has no data, use null or [] as appropriate.
- Preserve exact wording from source records for clinical accuracy.
"""


class GroqService:
    """Service for Groq AI operations in MedSync."""

    @staticmethod
    async def verify_connection() -> Dict[str, Any]:
        """
        Health check against Groq API.
        Verifies authentication and model accessibility.
        """
        try:
            _check_api_key()
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }

            candidate_models = _get_candidate_models()
            last_error = "No models available"

            async with httpx.AsyncClient(timeout=15.0) as client:
                for model in candidate_models:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "user", "content": "Reply with: OK"}
                        ],
                        "max_tokens": 10,
                        "temperature": 0.0
                    }

                    try:
                        response = await client.post(GROQ_API_URL, headers=headers, json=payload)
                        if response.status_code == 200:
                            data = response.json()
                            content = data["choices"][0]["message"]["content"].strip()
                            return {
                                "success": True,
                                "model": model,
                                "response": content,
                                "message": f"Groq API authentication successful (using {model})"
                            }
                        elif response.status_code == 413:
                            last_error = (
                                "Groq request is still too large after context reduction. "
                                "Please summarize fewer records or increase the Groq tier."
                            )
                            return {"success": False, "error": last_error}
                        elif response.status_code == 404:
                            last_error = f"Model {model} not found; trying fallback..."
                            continue
                        else:
                            last_error = f"HTTP {response.status_code}: {response.text}"
                    except Exception as e:
                        last_error = str(e)

            return {
                "success": False,
                "error": f"Groq authentication check failed: {last_error}"
            }

        except RuntimeError as e:
            return {"success": False, "error": str(e)}
        except httpx.RequestError as e:
            return {"success": False, "error": f"Network error connecting to Groq API: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": f"Groq authentication check failed: {str(e)}"}

    @staticmethod
    async def summarize_medical_records(records_text: str) -> Dict[str, Any]:
        """
        Sends patient medical history / records to Groq API and returns a structured summary.

        Args:
            records_text: Medical history, current records, or OCR extracted text.

        Returns:
            Dict containing success (bool), summary (dict), and optional error (str).
        """
        if not records_text or not records_text.strip():
            return {
                "success": False,
                "error": "No medical records or text provided for summarization."
            }

        if len(records_text.strip()) < 10:
            return {
                "success": False,
                "error": "Medical record text is too brief to analyze meaningfully."
            }

        try:
            _check_api_key()

            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }

            user_content = (
                f"{JSON_SCHEMA_PROMPT}\n\n"
                f"PATIENT MEDICAL INFORMATION / RECORDS TO SUMMARIZE:\n{_compact_records(records_text)}"
            )

            candidate_models = _get_candidate_models()
            last_error = "Summarization failed"
            used_model = None

            async with httpx.AsyncClient(timeout=45.0) as client:
                for model in candidate_models:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_INSTRUCTION},
                            {"role": "user", "content": user_content}
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.2,
                        "max_tokens": SUMMARY_COMPLETION_TOKEN_LIMIT
                    }

                    try:
                        response = await client.post(GROQ_API_URL, headers=headers, json=payload)

                        if response.status_code == 200:
                            data = response.json()
                            raw_content = data["choices"][0]["message"]["content"]
                            cleaned_json = _clean_json_string(raw_content)

                            try:
                                summary_dict = json.loads(cleaned_json)
                                normalized = _normalize_summary(summary_dict)
                                return {
                                    "success": True,
                                    "summary": normalized,
                                    "model": model
                                }
                            except json.JSONDecodeError:
                                last_error = "Groq returned an invalid JSON response."
                                continue

                        elif response.status_code == 413:
                            last_error = (
                                "Groq request is still too large after context reduction. "
                                "Please summarize fewer records or increase the Groq tier."
                            )
                            return {"success": False, "error": last_error}
                        elif response.status_code == 404:
                            # Model not available in this org, fallback to next
                            last_error = f"Model {model} unavailable on Groq."
                            continue
                        else:
                            error_detail = response.text
                            try:
                                err_json = response.json()
                                if "error" in err_json and "message" in err_json["error"]:
                                    error_detail = err_json["error"]["message"]
                            except Exception:
                                pass
                            last_error = f"Groq API Error ({response.status_code}): {error_detail}"

                    except httpx.TimeoutException:
                        last_error = "Request to Groq API timed out. Please try again."
                    except httpx.RequestError as e:
                        last_error = f"Network error connecting to Groq API: {str(e)}"

            return {
                "success": False,
                "error": last_error
            }

        except RuntimeError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"AI summarization failed: {str(e)}"}

    @staticmethod
    async def generate_final_patient_summary(normalized_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates the Final Patient Summary from ALL collected patient data.

        This is the Batch 2 Final Summary Engine method.

        Args:
            normalized_context: Structured dict from summary_data_service.collect_patient_data().
                Contains patient, documents, chat_sessions, ayush_history.

        Returns:
            Dict with:
              success (bool), summary (dict — structured JSON matching spec), model (str)

        SECURITY:
            - API key is never included in any response.
            - Patient data is never logged in full.
            - Returns clear error on failure — never fabricated fallback content.
        """
        if not normalized_context:
            return {
                "success": False,
                "error": "No patient context provided for final summary generation."
            }

        try:
            _check_api_key()

            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }

            # Serialize the context to JSON string for the user message
            try:
                context_json = _compact_records(
                    json.dumps(normalized_context, separators=(",", ":"), default=str)
                )
            except (TypeError, ValueError) as exc:
                return {
                    "success": False,
                    "error": f"Failed to serialize patient context for AI: {type(exc).__name__}"
                }

            user_content = (
                f"{FINAL_SUMMARY_JSON_SCHEMA}\n\n"
                f"=== PATIENT DATA TO SUMMARIZE ===\n"
                f"{context_json}\n"
                f"=== END PATIENT DATA ===\n\n"
                f"Now generate the final structured JSON summary from ONLY the data above."
            )

            candidate_models = _get_candidate_models()
            last_error = "Final summary generation failed"

            async with httpx.AsyncClient(timeout=90.0) as client:
                for model in candidate_models:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": FINAL_SUMMARY_SYSTEM_PROMPT},
                            {"role": "user", "content": user_content}
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.1,   # Low temperature for factual accuracy
                        "max_tokens": SUMMARY_COMPLETION_TOKEN_LIMIT,
                    }

                    try:
                        response = await client.post(GROQ_API_URL, headers=headers, json=payload)

                        if response.status_code == 200:
                            data = response.json()
                            raw_content = data["choices"][0]["message"]["content"]
                            cleaned_json = _clean_json_string(raw_content)

                            try:
                                summary_dict = json.loads(cleaned_json)
                            except json.JSONDecodeError:
                                last_error = f"Model {model} returned invalid JSON."
                                continue

                            # Validate required top-level keys are present
                            required_keys = [
                                "patient_overview", "chief_complaint", "clinical_summary",
                                "source_traceability", "ayush_history"
                            ]
                            missing_keys = [k for k in required_keys if k not in summary_dict]
                            if missing_keys:
                                last_error = (
                                    f"Model {model} returned incomplete JSON "
                                    f"(missing keys: {missing_keys})."
                                )
                                continue

                            # Normalize list fields to ensure they are always lists
                            list_fields = [
                                "symptoms", "past_medical_history", "past_surgical_history",
                                "medications", "allergies", "investigations", "laboratory_findings",
                                "diagnoses_mentioned_in_records", "procedures", "important_findings",
                                "red_flags", "uncertain_or_conflicting_information",
                                "missing_information", "questions_for_physician", "source_traceability"
                            ]
                            for field in list_fields:
                                if field not in summary_dict:
                                    summary_dict[field] = []
                                elif not isinstance(summary_dict[field], list):
                                    val = summary_dict[field]
                                    summary_dict[field] = [val] if val else []

                                    # Keep the public contract explicit while accepting
                                    # the older prompt names returned by some models.
                                    summary_dict.setdefault("surgical_history", summary_dict.get("past_surgical_history", []))
                                    summary_dict.setdefault("diagnoses_mentioned", summary_dict.get("diagnoses_mentioned_in_records", []))
                                    summary_dict.setdefault("history_of_present_illness", "Not available")
                                    summary_dict.setdefault("past_medical_history", [])
                                    summary_dict.setdefault("family_history", "Not available")
                                    summary_dict.setdefault("personal_history", "Not available")
                                    summary_dict.setdefault("investigations", [])
                                    summary_dict.setdefault("procedures", [])
                                    summary_dict.setdefault("important_findings", [])
                                    summary_dict.setdefault("missing_information", [])
                                    summary_dict.setdefault("uncertain_or_conflicting_information", [])
                                    summary_dict.setdefault("questions_for_physician", [])
                                    summary_dict["physician_verification_required"] = True
                                    summary_dict.setdefault("physician_verification_status", "unreviewed")

                            # Ensure dict fields
                            if not isinstance(summary_dict.get("patient_overview"), dict):
                                summary_dict["patient_overview"] = {
                                    "name": None, "age": None, "gender": None,
                                    "language": None, "abha_address": None
                                }
                            if not isinstance(summary_dict.get("review_of_systems"), dict):
                                summary_dict["review_of_systems"] = {}
                            if not isinstance(summary_dict.get("ayush_history"), dict):
                                summary_dict["ayush_history"] = {
                                    "prakriti": None, "vikriti": None, "sara": None,
                                    "samhanana": None, "pramana": None, "satmya": None,
                                    "sattva": None, "ahara_shakti": None, "vyayama_shakti": None,
                                    "vaya": None, "ahara": None, "vihara": None,
                                    "nidana": None, "samprapti": None
                                }

                            return {
                                "success": True,
                                "summary": summary_dict,
                                "model": model
                            }

                        elif response.status_code == 404:
                            last_error = f"Model {model} not available on this Groq account."
                            continue
                        else:
                            error_detail = response.text
                            try:
                                err_json = response.json()
                                if "error" in err_json and "message" in err_json["error"]:
                                    error_detail = err_json["error"]["message"]
                            except Exception:
                                pass
                            last_error = f"Groq API error ({response.status_code}): {error_detail}"

                    except httpx.TimeoutException:
                        last_error = (
                            "Final summary request timed out (90s). The patient record may be "
                            "too large. Please try again."
                        )
                    except httpx.RequestError as exc:
                        last_error = f"Network error: {str(exc)}"

            return {"success": False, "error": last_error}

        except RuntimeError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {
                "success": False,
                "error": f"Final summary generation failed: {type(exc).__name__}"
            }

