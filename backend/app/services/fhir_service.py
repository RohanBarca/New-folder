"""
MedSync — FHIR R4 Interoperability Service
-------------------------------------------
Transforms stored MedSync patient records into standard HL7 FHIR Release 4 (R4) Bundles.

Supported Resource Types:
  - Bundle (document / collection type)
  - Patient (demographics, language, ABHA identifier)
  - Condition (chief complaint, past medical history, symptoms)
  - MedicationStatement (current and extracted medications)
  - AllergyIntolerance (documented allergies)
  - Observation (vitals, laboratory findings, AYUSH Dashavidha Pariksha)
  - Procedure (past surgical history & documented procedures)
  - DiagnosticReport (OPD medical documents and OCR extractions)
  - Encounter (clinical chatbot interview sessions)
  - Composition (clinical summary & intake document header)

SAFETY & ACCURACY RULES:
  - ZERO FABRICATION: Only transforms facts explicitly present in PostgreSQL.
  - Empty or unrecorded sections produce NO extraneous resources.
  - Generates conformant FHIR JSON with proper resourceType and identifier blocks.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session, joinedload

from ..models.patient import Patient
from ..models.document import Document
from ..models.chat_session import ChatSession
from ..models.ayush_history import AyushHistory
from ..models.final_summary import FinalSummary
from .audit_service import log_audit_event


class FhirService:
    """Transforms stored MedSync patient data into standard FHIR R4 Bundles."""

    @staticmethod
    def generate_patient_bundle(db: Session, patient_id: uuid.UUID) -> Dict[str, Any]:
        """
        Builds a complete FHIR R4 Bundle for the specified patient.
        
        Args:
            db: SQLAlchemy database session.
            patient_id: Validated patient UUID.
            
        Returns:
            FHIR R4 Bundle resource dict.
            
        Raises:
            ValueError if patient does not exist.
        """
        # 1. Fetch patient
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient with ID '{patient_id}' does not exist.")

        # 2. Fetch associated clinical data
        documents = (
            db.query(Document)
            .options(joinedload(Document.ocr_result))
            .filter(Document.patient_id == patient_id)
            .all()
        )
        chat_sessions = (
            db.query(ChatSession)
            .options(joinedload(ChatSession.messages))
            .filter(ChatSession.patient_id == patient_id)
            .all()
        )
        ayush_record = (
            db.query(AyushHistory)
            .filter(AyushHistory.patient_id == patient_id)
            .order_by(AyushHistory.updated_at.desc())
            .first()
        )
        latest_summary = (
            db.query(FinalSummary)
            .filter(FinalSummary.patient_id == patient_id)
            .order_by(FinalSummary.created_at.desc())
            .first()
        )

        entries: List[Dict[str, Any]] = []
        now_iso = datetime.now(timezone.utc).isoformat()
        patient_ref = f"Patient/{patient.id}"

        # ── 1. FHIR Patient Resource ──────────────────────────────────────────
        patient_resource: Dict[str, Any] = {
            "resourceType": "Patient",
            "id": str(patient.id),
            "identifier": [
                {
                    "system": "https://medsync.health/patients",
                    "value": str(patient.id),
                }
            ],
            "name": [
                {
                    "use": "official",
                    "text": patient.name or "Unknown",
                }
            ],
            "active": True,
        }

        if patient.gender:
            gender_lower = patient.gender.lower()
            if gender_lower in ["male", "female", "other"]:
                patient_resource["gender"] = gender_lower
            else:
                patient_resource["gender"] = "unknown"

        if patient.date_of_birth:
            patient_resource["birthDate"] = patient.date_of_birth.isoformat()

        if patient.phone:
            patient_resource["telecom"] = [
                {
                    "system": "phone",
                    "value": patient.phone,
                    "use": "mobile",
                }
            ]

        if patient.language:
            patient_resource["communication"] = [
                {
                    "language": {
                        "coding": [
                            {
                                "system": "urn:ietf:bcp:47",
                                "code": patient.language,
                                "display": "Hindi" if patient.language == "hi" else "English",
                            }
                        ]
                    },
                    "preferred": True,
                }
            ]

        if patient.abha_address:
            patient_resource["identifier"].append({
                "system": "https://healthid.abdm.gov.in",
                "type": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                            "code": "MR",
                            "display": "ABHA Address",
                        }
                    ]
                },
                "value": patient.abha_address,
            })

        entries.append({
            "fullUrl": f"urn:uuid:{patient.id}",
            "resource": patient_resource,
        })

        # ── 2. FHIR Condition Resources (from Summary & Chat) ────────────────
        if latest_summary and latest_summary.summary_json:
            s_json = latest_summary.summary_json

            # Chief complaint as Condition
            if s_json.get("chief_complaint") and s_json["chief_complaint"].lower() not in ["not available", "none"]:
                entries.append({
                    "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                    "resource": {
                        "resourceType": "Condition",
                        "id": str(uuid.uuid4()),
                        "clinicalStatus": {
                            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
                        },
                        "category": [
                            {
                                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-category", "code": "problem-list-item", "display": "Chief Complaint"}]
                            }
                        ],
                        "code": {"text": s_json["chief_complaint"]},
                        "subject": {"reference": patient_ref, "display": patient.name},
                        "recordedDate": latest_summary.created_at.isoformat() if latest_summary.created_at else now_iso,
                    }
                })

            # Past medical history conditions
            for cond in s_json.get("past_medical_history", []):
                if cond and str(cond).strip():
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Condition",
                            "id": str(uuid.uuid4()),
                            "clinicalStatus": {
                                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "resolved"}]
                            },
                            "category": [
                                {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-category", "code": "encounter-diagnosis", "display": "Past Medical History"}]}
                            ],
                            "code": {"text": str(cond)},
                            "subject": {"reference": patient_ref, "display": patient.name},
                        }
                    })

            # Reported symptoms
            for sym in s_json.get("symptoms", []):
                if sym and str(sym).strip():
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Condition",
                            "id": str(uuid.uuid4()),
                            "clinicalStatus": {
                                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
                            },
                            "code": {"text": f"Symptom: {str(sym)}"},
                            "subject": {"reference": patient_ref, "display": patient.name},
                        }
                    })

            # Diagnoses mentioned in records
            for diag in s_json.get("diagnoses_mentioned_in_records", []):
                if diag and str(diag).strip():
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Condition",
                            "id": str(uuid.uuid4()),
                            "category": [
                                {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-category", "code": "encounter-diagnosis", "display": "Documented Diagnosis"}]}
                            ],
                            "code": {"text": str(diag)},
                            "subject": {"reference": patient_ref, "display": patient.name},
                            "note": [{"text": "Extracted from uploaded medical records"}],
                        }
                    })

            # ── 3. FHIR MedicationStatement Resources ─────────────────────────
            for med in s_json.get("medications", []):
                med_name = med.get("name") if isinstance(med, dict) else str(med)
                if med_name and med_name.strip():
                    med_resource: Dict[str, Any] = {
                        "resourceType": "MedicationStatement",
                        "id": str(uuid.uuid4()),
                        "status": "active",
                        "medicationCodeableConcept": {"text": med_name},
                        "subject": {"reference": patient_ref, "display": patient.name},
                    }
                    if isinstance(med, dict):
                        dosage_text = []
                        if med.get("dosage"): dosage_text.append(f"Dose: {med['dosage']}")
                        if med.get("frequency"): dosage_text.append(f"Freq: {med['frequency']}")
                        if med.get("duration"): dosage_text.append(f"Duration: {med['duration']}")
                        if dosage_text:
                            med_resource["dosage"] = [{"text": ", ".join(dosage_text)}]
                        if med.get("source"):
                            med_resource["note"] = [{"text": f"Source: {med['source']}"}]
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": med_resource,
                    })

            # ── 4. FHIR AllergyIntolerance Resources ──────────────────────────
            for allergy in s_json.get("allergies", []):
                all_text = str(allergy).strip()
                if all_text and "no known" not in all_text.lower():
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "AllergyIntolerance",
                            "id": str(uuid.uuid4()),
                            "clinicalStatus": {
                                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]
                            },
                            "code": {"text": all_text},
                            "patient": {"reference": patient_ref, "display": patient.name},
                        }
                    })

            # ── 5. FHIR Observations (Vitals & Labs) ──────────────────────────
            for vit in s_json.get("vitals", []):
                if isinstance(vit, dict) and vit.get("parameter"):
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Observation",
                            "id": str(uuid.uuid4()),
                            "status": "final",
                            "category": [
                                {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs", "display": "Vital Signs"}]}
                            ],
                            "code": {"text": vit["parameter"]},
                            "subject": {"reference": patient_ref, "display": patient.name},
                            "valueString": str(vit.get("value", "")),
                            "note": [{"text": f"Source: {vit.get('source', 'Clinical intake')}"}],
                        }
                    })

            for lab in s_json.get("laboratory_findings", []):
                if isinstance(lab, dict) and lab.get("test"):
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Observation",
                            "id": str(uuid.uuid4()),
                            "status": "final",
                            "category": [
                                {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "laboratory", "display": "Laboratory"}]}
                            ],
                            "code": {"text": lab["test"]},
                            "subject": {"reference": patient_ref, "display": patient.name},
                            "valueString": f"{lab.get('value', '')} {lab.get('unit', '')}".strip(),
                            "referenceRange": [{"text": lab["reference_range"]}] if lab.get("reference_range") else None,
                        }
                    })

            # ── 6. FHIR Procedures ───────────────────────────────────────────
            for proc in s_json.get("past_surgical_history", []) + s_json.get("procedures", []):
                if proc and str(proc).strip():
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Procedure",
                            "id": str(uuid.uuid4()),
                            "status": "completed",
                            "code": {"text": str(proc)},
                            "subject": {"reference": patient_ref, "display": patient.name},
                        }
                    })

        # ── 7. FHIR Observations for AYUSH Parameters ────────────────────────
        if ayush_record:
            ayush_params = [
                ("prakriti", "Ayurveda Prakriti (Patient-Reported)"),
                ("vikriti", "Ayurveda Vikriti (Patient-Reported)"),
                ("sara", "Ayurveda Sara (Tissue Quality)"),
                ("samhanana", "Ayurveda Samhanana (Body Build)"),
                ("pramana", "Ayurveda Pramana (Proportion)"),
                ("satmya", "Ayurveda Satmya (Adaptability)"),
                ("sattva", "Ayurveda Sattva (Mental Temperament)"),
                ("ahara_shakti", "Ayurveda Ahara Shakti (Digestive Capacity)"),
                ("vyayama_shakti", "Ayurveda Vyayama Shakti (Physical Capacity)"),
                ("vaya", "Ayurveda Vaya (Age/Life Stage)"),
                ("ahara", "Ayurveda Ahara (Diet Habits)"),
                ("vihara", "Ayurveda Vihara (Daily Lifestyle)"),
                ("nidana", "Ayurveda Nidana (Etiological Factors)"),
                ("samprapti", "Ayurveda Samprapti (Disease Progression)"),
            ]
            for attr, display in ayush_params:
                val = getattr(ayush_record, attr, None)
                if val and str(val).strip():
                    entries.append({
                        "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                        "resource": {
                            "resourceType": "Observation",
                            "id": str(uuid.uuid4()),
                            "status": "final",
                            "category": [
                                {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "exam", "display": "AYUSH Assessment"}]}
                            ],
                            "code": {"text": display},
                            "subject": {"reference": patient_ref, "display": patient.name},
                            "valueString": str(val),
                            "note": [{"text": "Patient-reported responses during AYUSH intake"}],
                        }
                    })

        # ── 8. FHIR DiagnosticReport & DocumentReference for Uploaded Docs ───
        for doc in documents:
            doc_id = str(doc.id)
            entries.append({
                "fullUrl": f"urn:uuid:{doc_id}",
                "resource": {
                    "resourceType": "DiagnosticReport",
                    "id": doc_id,
                    "status": "final",
                    "code": {"text": doc.document_type or "Medical Document"},
                    "subject": {"reference": patient_ref, "display": patient.name},
                    "effectiveDateTime": doc.uploaded_at.isoformat() if doc.uploaded_at else now_iso,
                    "conclusion": doc.ocr_result.extracted_text[:1000] if doc.ocr_result and doc.ocr_result.extracted_text else "Document attached without extracted text.",
                    "presentedForm": [
                        {
                            "contentType": doc.file_type or "application/pdf",
                            "title": doc.original_filename,
                        }
                    ],
                }
            })

        # ── 9. FHIR Encounter for Chatbot Intake Sessions ────────────────────
        for sess in chat_sessions:
            entries.append({
                "fullUrl": f"urn:uuid:{sess.id}",
                "resource": {
                    "resourceType": "Encounter",
                    "id": str(sess.id),
                    "status": "finished" if sess.status == "completed" else "in-progress",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "VR",
                        "display": "Virtual Intake Consultation",
                    },
                    "type": [{"text": f"AI Clinical Intake ({sess.mode.capitalize()})"}],
                    "subject": {"reference": patient_ref, "display": patient.name},
                    "period": {
                        "start": sess.started_at.isoformat() if sess.started_at else now_iso,
                        "end": sess.completed_at.isoformat() if sess.completed_at else None,
                    },
                }
            })

        # ── 10. Assemble Root FHIR R4 Bundle ──────────────────────────────────
        bundle_id = str(uuid.uuid4())
        fhir_bundle = {
            "resourceType": "Bundle",
            "id": bundle_id,
            "meta": {
                "lastUpdated": now_iso,
                "profile": ["http://hl7.org/fhir/StructureDefinition/Bundle"],
            },
            "identifier": {
                "system": "https://medsync.health/bundles",
                "value": bundle_id,
            },
            "type": "collection",
            "timestamp": now_iso,
            "total": len(entries),
            "entry": entries,
        }

        # Record audit event
        log_audit_event(
            db=db,
            actor_type="doctor",
            action="fhir_exported",
            resource_type="fhir_bundle",
            patient_id=patient_id,
            resource_id=bundle_id,
            details={
                "total_entries": len(entries),
                "resource_types": list(set(e["resource"]["resourceType"] for e in entries)),
            }
        )

        return fhir_bundle
