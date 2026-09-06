/**
 * MedSync — Doctor Service
 * -------------------------
 * Provides clinical data access for the Physician Dashboard and Patient Record Viewer.
 * Structured to integrate seamlessly with future FastAPI backend endpoints:
 *   - GET  /api/doctor/dashboard
 *   - GET  /api/doctor/patients
 *   - GET  /api/doctor/patients/{patient_id}
 *   - PUT  /api/doctor/patients/{patient_id}
 *   - POST /api/doctor/patients/{patient_id}/verify
 */

// Initial realistic clinical mock data store
import { API_BASE } from './api';

let MOCK_PATIENTS = [
  {
    id: "MS-8492",
    patient_id: "MS-8492",
    name: "Rahul Sharma",
    age: 42,
    gender: "Male",
    phone: "+91 98765 43210",
    language: "hi",
    language_display: "हिन्दी / Hindi",
    abha_status: "ABHA integration pending",
    registration_date: "2026-09-02",
    last_updated: "10 mins ago",
    status: "Awaiting Review",
    has_red_flag: true,
    red_flags: [
      {
        description: "Severe crushing retrosternal chest pain radiating to left arm with acute breathlessness reported.",
        source: "Patient conversation (AI Interview)",
        detected_at: "2026-09-02 22:45",
        severity: "Urgent",
      }
    ],
    overview_summary: "42M presenting with acute chest discomfort and history of hypertension.",
    clinical_history: {
      chief_complaint: {
        title: "Chief Complaint",
        content: "Crushing chest discomfort for the past 2 hours, radiating to left shoulder and arm, accompanied by mild diaphoresis.",
        source: "Patient conversation (AI Intake)",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:45"
      },
      hpi: {
        title: "History of Present Illness (HPI)",
        content: "Onset was sudden while climbing stairs 2 hours ago. Pain is pressure-like, severity 8/10. Aggravated by exertion, no relief with rest. Associated with shortness of breath and mild nausea. No prior similar episodes.",
        source: "Patient conversation (AI Intake)",
        type: "AI-structured",
        last_edited: "2026-09-02 22:46"
      },
      past_medical_history: {
        title: "Past Medical History",
        content: "Essential Hypertension (diagnosed 2021). No known history of Diabetes Mellitus, CAD, or TIA.",
        source: "Uploaded record: Prescription_Cardio_2023.pdf",
        type: "Document-extracted",
        last_edited: "2026-09-02 22:40"
      },
      past_surgical_history: {
        title: "Past Surgical History",
        content: "Appendectomy in 2014 (uneventful recovery).",
        source: "Patient Registration Form",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:30"
      },
      medications: {
        title: "Current Medications",
        content: "1. Telmisartan 40mg PO once daily (Morning)\n2. Amlodipine 5mg PO once daily (Morning)",
        source: "Uploaded record: Prescription_Cardio_2023.pdf",
        type: "Document-extracted",
        last_edited: "2026-09-02 22:40"
      },
      allergies: {
        title: "Allergies",
        content: "No known drug allergies (NKDA). No reported food or environmental allergies.",
        source: "Patient conversation (AI Intake)",
        type: "AI-structured",
        last_edited: "2026-09-02 22:47"
      },
      family_history: {
        title: "Family History",
        content: "Father had myocardial infarction at age 58. Mother has Type 2 Diabetes.",
        source: "Patient conversation (AI Intake)",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:48"
      },
      personal_history: {
        title: "Personal / Social History",
        content: "Non-smoker. Occasional social alcohol consumption. Sedentary desk job with high occupational stress.",
        source: "Patient conversation (AI Intake)",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:48"
      },
      review_of_systems: {
        title: "Review of Systems (ROS)",
        content: "Cardiovascular: Positive for chest pain, diaphoresis. Negative for palpitations.\nRespiratory: Positive for mild dyspnea. Negative for cough, hemoptysis.\nGI: Positive for mild nausea. Negative for vomiting, abdominal pain.\nNeurological: Negative for dizziness, syncope, focal deficits.",
        source: "AI Clinical Synthesis",
        type: "AI-structured",
        last_edited: "2026-09-02 22:49"
      }
    },
    investigations: [
      {
        name: "Troponin I (High Sensitivity)",
        value: "0.08",
        unit: "ng/mL",
        reference_range: "< 0.04 ng/mL",
        is_abnormal: true,
        date: "2026-09-02",
        source_doc: "Lab_Cardiac_Profile_02Sep.pdf"
      },
      {
        name: "Blood Pressure",
        value: "148 / 94",
        unit: "mmHg",
        reference_range: "90/60 – 120/80 mmHg",
        is_abnormal: true,
        date: "2026-09-02",
        source_doc: "Clinic Vitals Log"
      },
      {
        name: "Hemoglobin (Hb)",
        value: "14.2",
        unit: "g/dL",
        reference_range: "13.0 – 17.0 g/dL",
        is_abnormal: false,
        date: "2026-09-02",
        source_doc: "CBC_Report_Aug2026.pdf"
      },
      {
        name: "Serum Creatinine",
        value: "0.95",
        unit: "mg/dL",
        reference_range: "0.7 – 1.3 mg/dL",
        is_abnormal: false,
        date: "2026-09-02",
        source_doc: "KFT_Report_Aug2026.pdf"
      },
      {
        name: "Fasting Blood Sugar (FBS)",
        value: "108",
        unit: "mg/dL",
        reference_range: "70 – 100 mg/dL",
        is_abnormal: true,
        date: "2026-08-20",
        source_doc: "Lipid_Sugar_Profile_2026.pdf"
      }
    ],
    documents: [
      {
        id: "doc-1",
        name: "Prescription_Cardio_2023.pdf",
        type: "OPD Prescription",
        upload_date: "2026-09-02 22:35",
        ocr_status: "Processed (100% confidence)",
        extracted_text: "Dr. A. Verma, MD Cardiology, City Hospital. Date: 14/11/2023. Patient: Rahul Sharma, 40M. Diagnosis: Essential Hypertension. Rx: Tab Telmisartan 40mg 1-0-0, Tab Amlodipine 5mg 1-0-0. Advise low salt diet and regular BP monitoring.",
        file_preview_url: null
      },
      {
        id: "doc-2",
        name: "Lab_Cardiac_Profile_02Sep.pdf",
        type: "Lab Report",
        upload_date: "2026-09-02 22:40",
        ocr_status: "Processed (98% confidence)",
        extracted_text: "Apex Diagnostic Lab. Date: 02/09/2026. Test: High Sensitivity Troponin I. Result: 0.08 ng/mL (Ref: <0.04 ng/mL). Note: Elevated levels require urgent clinical correlation.",
        file_preview_url: null
      }
    ],
    ayush_data: null, // AYUSH mode was not chosen for this patient
    ai_summary: {
      patient_overview: "42-year-old male with established history of Essential Hypertension presenting with acute retrosternal chest pain and diaphoresis.",
      current_complaint: "Acute onset substernal chest pressure radiating to left arm with dyspnea for 2 hours.",
      important_findings: [
        "Elevated High-Sensitivity Troponin I (0.08 ng/mL, ref <0.04)",
        "Elevated Blood Pressure (148/94 mmHg)",
        "Paternal history of premature coronary artery disease"
      ],
      medications_summary: "Telmisartan 40mg OD, Amlodipine 5mg OD for Hypertension.",
      allergies_summary: "No Known Drug Allergies (NKDA).",
      investigations_summary: "Recent Troponin I elevated. Normal renal parameters.",
      procedures_summary: "Past appendectomy (2014).",
      missing_information: "12-Lead ECG trace pending; lipid profile older than 6 months.",
      executive_summary: "42M presenting with classic anginal symptoms and mildly elevated troponin I on baseline hypertensive therapy. Immediate 12-lead ECG, cardiology consult, and ACS protocol evaluation indicated."
    },
    verification: {
      is_verified: false,
      verified_by: null,
      verified_at: null,
      physician_notes: ""
    }
  },
  {
    id: "MS-7219",
    patient_id: "MS-7219",
    name: "Sunita Patel",
    age: 56,
    gender: "Female",
    phone: "+91 94250 11223",
    language: "hi",
    language_display: "हिन्दी / Hindi",
    abha_status: "ABHA integration pending",
    registration_date: "2026-09-02",
    last_updated: "25 mins ago",
    status: "Review in Progress",
    has_red_flag: false,
    red_flags: [],
    overview_summary: "56F with chronic joint stiffness and indigestion seeking integrated Ayurvedic consultation.",
    clinical_history: {
      chief_complaint: {
        title: "Chief Complaint",
        content: "Bilateral knee pain and morning stiffness for 6 months, accompanied by sluggish digestion and bloating after meals.",
        source: "Patient conversation (AI Interview)",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:15"
      },
      hpi: {
        title: "History of Present Illness (HPI)",
        content: "Pain is dull aching, worsens with cold weather and prolonged walking. Morning stiffness lasts approximately 20-30 minutes. Relieved partially by warm oil massage and heat pads. Chronic irregular bowel routine.",
        source: "Patient conversation (AI Interview)",
        type: "AI-structured",
        last_edited: "2026-09-02 22:18"
      },
      past_medical_history: {
        title: "Past Medical History",
        content: "Osteoarthritis of bilateral knees (diagnosed 2024). Mild hypothyroidism on levothyroxine.",
        source: "Uploaded Prescription",
        type: "Document-extracted",
        last_edited: "2026-09-02 22:05"
      },
      past_surgical_history: {
        title: "Past Surgical History",
        content: "Not provided",
        source: "Patient conversation",
        type: "Not provided",
        last_edited: "2026-09-02 22:00"
      },
      medications: {
        title: "Current Medications",
        content: "1. Levothyroxine 50mcg PO OD (Empty stomach)\n2. Calcium + Vitamin D3 supplements OD",
        source: "Uploaded document",
        type: "Document-extracted",
        last_edited: "2026-09-02 22:05"
      },
      allergies: {
        title: "Allergies",
        content: "Allergic to Penicillin (developed hives in 2018).",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:19"
      },
      family_history: {
        title: "Family History",
        content: "Mother had rheumatoid arthritis.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:20"
      },
      personal_history: {
        title: "Personal / Social History",
        content: "Vegetarian diet. Prefers warm cooked meals. Disturbed sleep due to joint stiffness.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 22:20"
      },
      review_of_systems: {
        title: "Review of Systems (ROS)",
        content: "Musculoskeletal: Positive for knee pain, crepitus, morning stiffness.\nGI: Positive for bloating, constipation tendency.\nEndocrine: Managed hypothyroidism.",
        source: "AI Clinical Synthesis",
        type: "AI-structured",
        last_edited: "2026-09-02 22:22"
      }
    },
    investigations: [
      {
        name: "Serum TSH",
        value: "2.4",
        unit: "mIU/L",
        reference_range: "0.4 – 4.2 mIU/L",
        is_abnormal: false,
        date: "2026-08-15",
        source_doc: "Thyroid_Panel_Aug2026.pdf"
      },
      {
        name: "Uric Acid",
        value: "4.8",
        unit: "mg/dL",
        reference_range: "2.4 – 6.0 mg/dL",
        is_abnormal: false,
        date: "2026-08-15",
        source_doc: "Blood_Chemistry_Aug2026.pdf"
      },
      {
        name: "X-Ray Both Knees (AP/Lat)",
        value: "Mild medial joint space narrowing",
        unit: "",
        reference_range: "Normal joint space",
        is_abnormal: true,
        date: "2026-05-10",
        source_doc: "Radiology_Report_May2026.pdf"
      }
    ],
    documents: [
      {
        id: "doc-3",
        name: "Thyroid_Panel_Aug2026.pdf",
        type: "Lab Report",
        upload_date: "2026-09-02 22:02",
        ocr_status: "Processed (100% confidence)",
        extracted_text: "Metropolis Healthcare. Sunita Patel, 56F. TSH: 2.4 mIU/L (Euthyroid on medication). Free T4: 1.1 ng/dL.",
        file_preview_url: null
      }
    ],
    ayush_data: {
      prakriti: "Vata-Kapha predominant constitution tendency. Patient reports intolerance to dry, cold weather and inclination toward warm surroundings.",
      vikriti: "Vata-Kaphaja imbalance (Sandhivata presentation with Agnimandya).",
      sara: "Madhyama Sara (Moderate tissue vitality).",
      samhanana: "Madhyama Samhanana (Moderate body compactness).",
      pramana: "Pramana within standard anthropometric limits for age/gender.",
      satmya: "Satmya to vegetarian diet, dairy, and mild spices; Asatmya to fermented and stale food.",
      sattva: "Madhyama Sattva (Moderate mental resilience and patience).",
      ahara_shakti: "Manda Agni (Sluggish digestion with post-prandial bloating).",
      vyayama_shakti: "Avara Vyayama Shakti (Low exercise capacity due to knee discomfort).",
      vaya: "Pravriddha / Madhyama Vaya (56 years).",
      ahara: "Vegetarian, irregular meal timing, low water intake.",
      vihara: "Sedentary household routine, interrupted sleep pattern.",
      nidana: "Cold weather exposure, irregular diet, lack of joint-protective activity.",
      samprapti: "Vata dosha aggravation in joints with ama accumulation in digestive tract."
    },
    ai_summary: {
      patient_overview: "56-year-old female with bilateral knee osteoarthritis and hypothyroidism seeking integrative Ayurvedic and allopathic review.",
      current_complaint: "Bilateral knee arthralgia with morning stiffness (6 months) and chronic sluggish digestion.",
      important_findings: [
        "X-Ray confirms medial compartment knee joint space narrowing",
        "Euthyroid on Levothyroxine 50mcg",
        "Penicillin allergy documented",
        "Vata-Kapha constitutional tendency with Manda Agni (sluggish digestion)"
      ],
      medications_summary: "Levothyroxine 50mcg OD, Calcium + D3.",
      allergies_summary: "Penicillin allergy (Hives).",
      investigations_summary: "TSH normal (2.4), Uric acid normal (4.8), Knee X-ray shows OA changes.",
      procedures_summary: "No major surgeries recorded.",
      missing_information: "Vitamin D3 levels older than 1 year.",
      executive_summary: "56F with bilateral knee osteoarthritis and Vata-Kapha constitutional features. Responding to conservative warmth measures; recommend holistic joint management, physiotherapy, and dietary Agni-supportive routine."
    },
    verification: {
      is_verified: false,
      verified_by: null,
      verified_at: null,
      physician_notes: ""
    }
  },
  {
    id: "MS-3104",
    patient_id: "MS-3104",
    name: "Vikram Sengupta",
    age: 29,
    gender: "Male",
    phone: "+91 91234 56789",
    language: "en",
    language_display: "English",
    abha_status: "ABHA integration pending",
    registration_date: "2026-09-02",
    last_updated: "1 hour ago",
    status: "Verified",
    has_red_flag: false,
    red_flags: [],
    overview_summary: "29M presenting with seasonal allergic rhinitis and dry cough.",
    clinical_history: {
      chief_complaint: {
        title: "Chief Complaint",
        content: "Watery rhinorrhea, nasal congestion, sneezing paroxysms, and mild dry cough for 5 days.",
        source: "Patient conversation (AI Interview)",
        type: "Patient-provided",
        last_edited: "2026-09-02 21:30"
      },
      hpi: {
        title: "History of Present Illness (HPI)",
        content: "Symptoms started after exposure to dust during home cleaning. No high fever, throat pain, or shortness of breath. Symptoms worsen in the mornings.",
        source: "Patient conversation (AI Interview)",
        type: "AI-structured",
        last_edited: "2026-09-02 21:32"
      },
      past_medical_history: {
        title: "Past Medical History",
        content: "Seasonal allergic rhinitis since childhood. No history of bronchial asthma.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 21:33"
      },
      past_surgical_history: {
        title: "Past Surgical History",
        content: "None reported.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 21:33"
      },
      medications: {
        title: "Current Medications",
        content: "Cetirizine 10mg PO PRN for allergies.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 21:34"
      },
      allergies: {
        title: "Allergies",
        content: "Known dust and pollen allergy. No known drug allergies.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 21:34"
      },
      family_history: {
        title: "Family History",
        content: "Not provided",
        source: "Patient conversation",
        type: "Not provided",
        last_edited: "2026-09-02 21:35"
      },
      personal_history: {
        title: "Personal / Social History",
        content: "Non-smoker, non-drinker. Regular jogging routine.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 21:35"
      },
      review_of_systems: {
        title: "Review of Systems (ROS)",
        content: "ENT: Positive for rhinorrhea, sneezing. Negative for otalgia, sore throat.\nRespiratory: Mild dry cough, no wheezing or dyspnea.",
        source: "AI Clinical Synthesis",
        type: "AI-structured",
        last_edited: "2026-09-02 21:36"
      }
    },
    investigations: [],
    documents: [],
    ayush_data: null,
    ai_summary: {
      patient_overview: "29-year-old male with recurrent seasonal allergic rhinitis presenting with acute exacerbation triggered by dust.",
      current_complaint: "Allergic rhinitis and dry cough for 5 days.",
      important_findings: ["Afebrile, no signs of lower respiratory involvement"],
      medications_summary: "Cetirizine 10mg PRN.",
      allergies_summary: "Dust and pollen.",
      investigations_summary: "No document-based labs submitted.",
      procedures_summary: "None.",
      missing_information: "None.",
      executive_summary: "Acute flare of seasonal allergic rhinitis following dust exposure. Manage conservatively with antihistamines and allergen avoidance."
    },
    verification: {
      is_verified: true,
      verified_by: "Dr. Ananya Ray, MD",
      verified_at: "2026-09-02 22:00",
      physician_notes: "Reviewed and confirmed history. Advised Fluticasone nasal spray and environmental precautions."
    }
  },
  {
    id: "MS-5091",
    patient_id: "MS-5091",
    name: "Anjali Gupta",
    age: 34,
    gender: "Female",
    phone: "+91 97112 33445",
    language: "en",
    language_display: "English",
    abha_status: "ABHA integration pending",
    registration_date: "2026-09-02",
    last_updated: "2 hours ago",
    status: "Consultation Complete",
    has_red_flag: false,
    red_flags: [],
    overview_summary: "34F routine antenatal second trimester follow-up.",
    clinical_history: {
      chief_complaint: {
        title: "Chief Complaint",
        content: "Routine 24-week antenatal checkup. Experiencing mild lower backache and intermittent heartburn.",
        source: "Patient conversation (AI Interview)",
        type: "Patient-provided",
        last_edited: "2026-09-02 20:30"
      },
      hpi: {
        title: "History of Present Illness (HPI)",
        content: "G2P1L1 at 24 weeks gestation. Good fetal movements perceived. No spotting, leaking, or severe headache.",
        source: "Patient conversation",
        type: "AI-structured",
        last_edited: "2026-09-02 20:32"
      },
      past_medical_history: {
        title: "Past Medical History",
        content: "Previous full-term normal vaginal delivery in 2021 without complications.",
        source: "Patient Registration",
        type: "Patient-provided",
        last_edited: "2026-09-02 20:20"
      },
      past_surgical_history: {
        title: "Past Surgical History",
        content: "None",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 20:25"
      },
      medications: {
        title: "Current Medications",
        content: "1. Ferrous Ascorbate + Folic Acid 1 tab OD\n2. Calcium Carbonate 500mg BD",
        source: "Uploaded Prescription",
        type: "Document-extracted",
        last_edited: "2026-09-02 20:25"
      },
      allergies: {
        title: "Allergies",
        content: "No known drug allergies (NKDA).",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 20:26"
      },
      family_history: {
        title: "Family History",
        content: "No gestational diabetes or preeclampsia in first-degree relatives.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 20:27"
      },
      personal_history: {
        title: "Personal / Social History",
        content: "Non-smoker, non-drinker. Adequate rest and balanced nutrition.",
        source: "Patient conversation",
        type: "Patient-provided",
        last_edited: "2026-09-02 20:28"
      },
      review_of_systems: {
        title: "Review of Systems (ROS)",
        content: "Obstetric: Fetal kicks active. No contractions, bleeding, or pedal edema.",
        source: "AI Clinical Synthesis",
        type: "AI-structured",
        last_edited: "2026-09-02 20:30"
      }
    },
    investigations: [
      {
        name: "Hemoglobin",
        value: "11.8",
        unit: "g/dL",
        reference_range: "11.0 – 14.0 g/dL (Pregnancy)",
        is_abnormal: false,
        date: "2026-08-25",
        source_doc: "ANC_Panel_24w.pdf"
      },
      {
        name: "OGTT (75g 2-hour Glucose)",
        value: "122",
        unit: "mg/dL",
        reference_range: "< 140 mg/dL",
        is_abnormal: false,
        date: "2026-08-25",
        source_doc: "ANC_Panel_24w.pdf"
      }
    ],
    documents: [
      {
        id: "doc-4",
        name: "ANC_Panel_24w.pdf",
        type: "Lab Report",
        upload_date: "2026-09-02 20:15",
        ocr_status: "Processed (100% confidence)",
        extracted_text: "City Maternity Lab. Anjali Gupta, 34F. Hb: 11.8 g/dL. OGTT 2-hr: 122 mg/dL. Urine Routine: Nil albumin, nil sugar.",
        file_preview_url: null
      }
    ],
    ayush_data: null,
    ai_summary: {
      patient_overview: "34-year-old G2P1 at 24 weeks gestation with normal antenatal profile.",
      current_complaint: "Routine 24-week follow-up with mild physiological backache.",
      important_findings: ["Normal OGTT (122 mg/dL)", "Normal Hb (11.8 g/dL)", "Active fetal movements"],
      medications_summary: "Standard iron and calcium supplementation.",
      allergies_summary: "NKDA.",
      investigations_summary: "Gestational diabetes screening negative; normocytic normochromic blood picture.",
      procedures_summary: "None.",
      missing_information: "Anomaly scan report to be uploaded.",
      executive_summary: "Healthy singleton pregnancy at 24 weeks. Continue routine micronutrients and scheduled growth ultrasound."
    },
    verification: {
      is_verified: true,
      verified_by: "Dr. Rajesh K. Nair, MS (OBGYN)",
      verified_at: "2026-09-02 21:15",
      physician_notes: "Vitals stable, fundal height corresponds to gestational age. Reassured on mild heartburn."
    }
  }
];

let backendAvailabilityCache = { checkedAt: 0, available: false };
const CLINICAL_HISTORY_SECTIONS = [
  'chief_complaint',
  'hpi',
  'past_medical_history',
  'past_surgical_history',
  'medications',
  'allergies',
  'family_history',
  'personal_history',
  'review_of_systems',
];

function normalizeHistorySection(section) {
  const value = String(section || '').toLowerCase().replace(/[^a-z]/g, '');
  if (value.includes('chief') || value.includes('complaint')) return 'chief_complaint';
  if (value.includes('hpi') || value.includes('presentillness')) return 'hpi';
  if (value.includes('pastmedical') || value.includes('medicalhistory')) return 'past_medical_history';
  if (value.includes('surg')) return 'past_surgical_history';
  if (value.includes('medication') || value.includes('medicine')) return 'medications';
  if (value.includes('allerg')) return 'allergies';
  if (value.includes('family')) return 'family_history';
  if (value.includes('personal') || value.includes('social') || value.includes('lifestyle')) return 'personal_history';
  if (value.includes('reviewofsystem') || value === 'ros') return 'review_of_systems';
  return null;
}

async function getStructuredClinicalHistory(patientId, sessions) {
  const grouped = Object.fromEntries(CLINICAL_HISTORY_SECTIONS.map((key) => [key, []]));
  await Promise.all((sessions || []).map(async (session) => {
    const sessionId = session.id || session.session_id;
    if (!sessionId) return;
    try {
      const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages?patient_id=${encodeURIComponent(patientId)}`);
      if (!response.ok) return;
      const messages = await response.json();
      (messages || []).forEach((message) => {
        if (message.role !== 'patient' || !message.message_text?.trim()) return;
        const section = normalizeHistorySection(message.section);
        if (section) grouped[section].push(message);
      });
    } catch {
      // A missing session should not hide the rest of the patient record.
    }
  }));

  return Object.fromEntries(CLINICAL_HISTORY_SECTIONS.map((key) => {
    const entries = grouped[key];
    return [key, entries.length > 0 ? {
      title: key.replace(/_/g, ' '),
      content: entries.map((entry) => entry.message_text.trim()).join('\n'),
      source: 'Patient conversation (saved AI interview)',
      type: 'Patient-provided',
      last_edited: entries[entries.length - 1].created_at || null,
    } : {
      title: key.replace(/_/g, ' '),
      content: 'Not provided',
      source: 'Not provided',
      type: 'Not provided',
      last_edited: null,
    }];
  }));
}

async function backendIsAvailable() {
  const now = Date.now();
  const ttlMs = 15000;

  if (now - backendAvailabilityCache.checkedAt < ttlMs) {
    return backendAvailabilityCache.available;
  }

  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', cache: 'no-store' });
    const available = res.ok;
    backendAvailabilityCache = { checkedAt: now, available };
    return available;
  } catch {
    backendAvailabilityCache = { checkedAt: now, available: false };
    return false;
  }
}

const doctorService = {
  async getDatasetPatients() {
    try {
      const response = await fetch(`${API_BASE}/api/dataset/patients`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load clinical reference data.');
      const data = await response.json();
      return { success: true, data: data.patients || [] };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to load clinical reference data.', data: [] };
    }
  },

  async getDatasetPatient(patientId) {
    try {
      const response = await fetch(`${API_BASE}/api/dataset/patients/${encodeURIComponent(patientId)}`, { cache: 'no-store' });
      if (response.status === 404) {
        return { success: false, error: 'Reference record not found.' };
      }
      if (!response.ok) throw new Error('Unable to load clinical reference data.');
      return { success: true, data: await response.json() };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to load clinical reference data.' };
    }
  },

  async summarizeDatasetPatient(patientId) {
    try {
      const response = await fetch(`${API_BASE}/api/dataset/patients/${encodeURIComponent(patientId)}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to generate the AI reference summary.');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to generate the AI reference summary.' };
    }
  },

  /**
   * Retrieves dashboard summary metrics
   */
  async getDashboardStats() {
    try {
      const response = await fetch(`${API_BASE}/api/patients?limit=100`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const patients = data.patients || [];
        return {
          success: true,
          data: {
            total_patients: data.total ?? patients.length,
            awaiting_review: patients.length,
            review_in_progress: 0,
            completed_histories: 0,
            red_flags_count: 0,
          }
        };
      }
    } catch {
      // Use the local demo registry when the backend is unavailable.
    }

    const totalPatients = MOCK_PATIENTS.length;
    const awaitingReview = MOCK_PATIENTS.filter(p => p.status === "Awaiting Review").length;
    const reviewInProgress = MOCK_PATIENTS.filter(p => p.status === "Review in Progress").length;
    const completed = MOCK_PATIENTS.filter(p => p.status === "Verified" || p.status === "Consultation Complete").length;
    const redFlags = MOCK_PATIENTS.filter(p => p.has_red_flag).length;

    return {
      success: true,
      data: {
        total_patients: totalPatients,
        awaiting_review: awaitingReview,
        review_in_progress: reviewInProgress,
        completed_histories: completed,
        red_flags_count: redFlags,
      }
    };
  },

  /**
   * Retrieves list of patients with search, status filters, and sorting
   */
  async getPatients({ search = '', status = 'all', hasRedFlag = false, sortBy = 'recent' } = {}) {
    let results = [...MOCK_PATIENTS];

    // Try the registry directly so a stale health-cache result cannot hide real patients.
    const isBackendLive = true;
    if (isBackendLive) {
      // Attempt to merge real registered patients from backend
      try {
        const res = await fetch(`${API_BASE}/api/patients?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const dbPatients = data.patients || [];
          if (dbPatients.length > 0) {
            // The database registry is authoritative when it is available.
            // Keeping mock rows here made real patients disappear behind stale UI state.
            results = dbPatients.map((p) => ({
              id: p.id,
              patient_id: p.id.substring(0, 8).toUpperCase(),
              real_uuid: p.id,
              name: p.name,
              age: p.date_of_birth ? (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()) : 35,
              gender: p.gender || 'Not specified',
              phone: p.phone || 'Not provided',
              language: p.language || 'en',
              language_display: p.language === 'hi' ? 'हिन्दी / Hindi' : 'English',
              abha_status: p.abha_status || 'ABHA integration pending',
              registration_date: p.created_at ? p.created_at.substring(0, 10) : 'Recent',
              last_updated: 'Recently registered',
              status: 'Awaiting Review',
              has_red_flag: false,
              red_flags: [],
              overview_summary: `${p.name} — Registered via MedSync portal.`,
              clinical_history: {},
              investigations: [],
              documents: [],
              ayush_data: null,
              ai_summary: null,
              verification: { is_verified: false, verified_by: null, verified_at: null, physician_notes: '' }
            }));
          }
        }
      } catch {
        // Backend offline or unreachable — gracefully fallback to mock patients
      }
    }

    if (isBackendLive && hasRedFlag) {
      results = await Promise.all(results.map(async (result) => {
        if (!result.real_uuid) return result;
        try {
          const flagsRes = await fetch(`${API_BASE}/api/patients/${result.real_uuid}/red-flags`);
          if (!flagsRes.ok) return result;
          const flagsJson = await flagsRes.json();
          const redFlags = flagsJson.red_flags || [];
          return { ...result, red_flags: redFlags, has_red_flag: redFlags.length > 0 };
        } catch {
          return result;
        }
      }));
    }

    // Filter by search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.patient_id.toLowerCase().includes(q) ||
        (p.overview_summary && p.overview_summary.toLowerCase().includes(q))
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      results = results.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }

    // Filter by red flag
    if (hasRedFlag) {
      results = results.filter(p => p.has_red_flag);
    }

    // Sort by criteria
    if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'red_flags_first') {
      results.sort((a, b) => (b.has_red_flag ? 1 : 0) - (a.has_red_flag ? 1 : 0));
    }

    return {
      success: true,
      count: results.length,
      data: results
    };
  },

  /**
   * Retrieves full clinical record for a specific patient ID
   */
  async getPatientRecord(patientId) {
    let patient = MOCK_PATIENTS.find(p => p.id === patientId || p.patient_id === patientId);

    // The record page should try the real API directly; a stale health-cache
    // result must not turn an existing patient into an endless loading state.
    const backendAvailable = true;

    // If not found in mock, try fetching from backend
    if (!patient && backendAvailable) {
      try {
        const res = await fetch(`${API_BASE}/api/patients/${patientId}`);
        if (res.ok) {
          const dbPatient = await res.json();
          patient = {
            id: dbPatient.id,
            patient_id: dbPatient.id.substring(0, 8).toUpperCase(),
            real_uuid: dbPatient.id,
            name: dbPatient.name,
            age: dbPatient.date_of_birth ? (new Date().getFullYear() - new Date(dbPatient.date_of_birth).getFullYear()) : 35,
            gender: dbPatient.gender || 'Not specified',
            phone: dbPatient.phone || 'Not provided',
            language: dbPatient.language || 'en',
            language_display: dbPatient.language === 'hi' ? 'हिन्दी / Hindi' : 'English',
            abha_status: dbPatient.abha_status || 'ABHA integration pending',
            registration_date: dbPatient.created_at ? dbPatient.created_at.substring(0, 10) : 'Recent',
            last_updated: 'Recently registered',
            status: 'Awaiting Review',
            has_red_flag: false,
            red_flags: [],
            overview_summary: `${dbPatient.name} — Registered via MedSync portal.`,
            clinical_history: {},
            investigations: [],
            documents: [],
            ayush_data: null,
            ai_summary: null,
            verification: { is_verified: false, verified_by: null, verified_at: null, physician_notes: '' }
          };
        }
      } catch {
        // Fall through
      }
    }

    if (!patient) {
      return {
        success: false,
        error: `Patient with ID '${patientId}' was not found.`
      };
    }

    // Always fetch real uploaded documents from the database for this patient
    const targetPatientId = patient.real_uuid || patient.id || patientId;
    if (backendAvailable) {
      try {
        const docsRes = await fetch(`${API_BASE}/api/patients/${targetPatientId}/documents`);
        if (docsRes.ok) {
          const dbDocs = await docsRes.json();
          if (Array.isArray(dbDocs) && dbDocs.length > 0) {
            const mappedDocs = dbDocs.map(d => ({
              id: d.document_id,
              name: d.filename,
              type: d.document_type || 'Medical Document',
              upload_date: d.uploaded_at ? d.uploaded_at.replace('T', ' ').substring(0, 16) : 'Recent',
              ocr_status: d.ocr_status === 'success' ? 'OCR Processed' : (d.ocr_status || 'Processed'),
              extracted_text: d.extracted_text || '',
              file_preview_url: null
            }));

            // Merge without duplicates
            const seenIds = new Set(mappedDocs.map(d => d.id));
            patient.documents = [
              ...mappedDocs,
              ...(patient.documents || []).filter(d => !seenIds.has(d.id))
            ];
          }
        }
      } catch {
        // Graceful fallback
      }

      // Fetch real AYUSH history from database if available
      try {
        const ayushRes = await fetch(`${API_BASE}/api/patients/${targetPatientId}/ayush-history`);
        if (ayushRes.ok) {
          const ayushJson = await ayushRes.json();
          if (ayushJson && ayushJson.ayush_history) {
            patient.ayush_data = ayushJson.ayush_history;
          }
        }
      } catch {
        // Graceful fallback
      }

      // Fetch real chat sessions from database if available
      try {
        const chatRes = await fetch(`${API_BASE}/api/patients/${targetPatientId}/chat-sessions`);
        if (chatRes.ok) {
          const chatJson = await chatRes.json();
          if (Array.isArray(chatJson) && chatJson.length > 0) {
            patient.chat_sessions = chatJson;
            patient.clinical_history = await getStructuredClinicalHistory(targetPatientId, chatJson);
          }
        }
      } catch {
        // Graceful fallback
      }

      // Load the persisted final synthesis and source-backed red flags for the doctor view.
      try {
        const [summaryRes, flagsRes] = await Promise.all([
          fetch(`${API_BASE}/api/patients/${targetPatientId}/summary`),
          fetch(`${API_BASE}/api/patients/${targetPatientId}/red-flags`),
        ]);
        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          const record = summaryJson.summary_record;
          if (record?.summary_json) {
            patient.ai_summary = record.summary_json;
            patient.summary_record = record;
            patient.verification = {
              is_verified: record.summary_json.physician_verification_status === 'verified',
              verified_by: null,
              verified_at: null,
              physician_notes: '',
            };
          }
        }
        if (flagsRes.ok) {
          const flagsJson = await flagsRes.json();
          patient.red_flags = flagsJson.red_flags || [];
          patient.has_red_flag = patient.red_flags.length > 0;
        }
      } catch {
        // Summary is optional until a physician generates it.
      }
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(patient))
    };
  },

  /**
   * Updates a specific clinical history section for a patient
   */
  async updatePatientRecord(patientId, sectionKey, updatedContent) {
    // In production: return fetch(`/api/doctor/patients/${patientId}`, { method: 'PUT', ... })
    const patient = MOCK_PATIENTS.find(p => p.id === patientId || p.patient_id === patientId);

    if (!patient) {
      return {
        success: false,
        error: "Patient not found."
      };
    }

    if (patient.clinical_history && patient.clinical_history[sectionKey]) {
      patient.clinical_history[sectionKey].content = updatedContent;
      patient.clinical_history[sectionKey].last_edited = "Just now (Physician Edited)";
      patient.clinical_history[sectionKey].type = "Physician-verified";
    }

    patient.last_updated = "Just now";

    return {
      success: true,
      message: "Clinical history section updated successfully.",
      data: patient
    };
  },

  /**
   * Marks a patient record as verified by physician
   */
  async verifyPatientRecord(patientId, physicianName = "Dr. Ananya Ray, MD", notes = "") {
    // In production: return fetch(`/api/doctor/patients/${patientId}/verify`, { method: 'POST', ... })
    const patient = MOCK_PATIENTS.find(p => p.id === patientId || p.patient_id === patientId);

    if (!patient) {
      return {
        success: false,
        error: "Patient not found."
      };
    }

    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 16);

    patient.status = "Verified";
    patient.verification = {
      is_verified: true,
      verified_by: physicianName,
      verified_at: formattedDate,
      physician_notes: notes || "Clinical history and investigations verified by attending physician."
    };
    patient.last_updated = "Just now";

    return {
      success: true,
      message: "Patient record marked as verified by physician.",
      data: patient
    };
  }
};

export default doctorService;
