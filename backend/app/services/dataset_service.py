"""Read-only loader for the bundled Kaggle clinical reference dataset."""

import csv
from pathlib import Path


# Keep the demo surface intentionally limited while retaining the bundled CSV
# for future expansion without an architecture change.
DATASET_LIMIT = 25
DATASET_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "datasets"
    / "Disease_symptom_and_patient_profile_dataset.csv"
)

_REQUIRED_COLUMNS = {
    "Disease",
    "Fever",
    "Cough",
    "Fatigue",
    "Difficulty Breathing",
    "Age",
    "Gender",
    "Blood Pressure",
    "Cholesterol Level",
    "Outcome Variable",
}

_SYMPTOM_FIELDS = {
    "fever",
    "cough",
    "fatigue",
    "difficulty_breathing",
}


def _map_row(row: dict[str, str], index: int) -> dict:
    symptoms = {
        "fever": row["Fever"],
        "cough": row["Cough"],
        "fatigue": row["Fatigue"],
        "difficulty_breathing": row["Difficulty Breathing"],
    }
    return {
        "id": f"kaggle-demo-{index:03d}",
        "reference_id": f"KAGGLE-{index:03d}",
        "source": "Kaggle Disease Symptom and Patient Profile Dataset",
        "disease": row["Disease"],
        "fever": row["Fever"],
        "cough": row["Cough"],
        "fatigue": row["Fatigue"],
        "difficulty_breathing": row["Difficulty Breathing"],
        # Keep the dataset value as supplied. This service intentionally does
        # not coerce or enrich reference data used for clinical comparison.
        "age": row["Age"],
        "gender": row["Gender"],
        "blood_pressure": row["Blood Pressure"],
        "cholesterol_level": row["Cholesterol Level"],
        "outcome": row["Outcome Variable"],
        "symptoms": symptoms,
        "is_reference_data": True,
    }


def load_demo_patients(limit: int = DATASET_LIMIT) -> list[dict]:
    """Load the configured number of read-only reference rows from the CSV."""
    if limit < 1:
        return []
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Reference dataset not found: {DATASET_PATH.name}")

    with DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as dataset_file:
        reader = csv.DictReader(dataset_file)
        columns = set(reader.fieldnames or [])
        missing = _REQUIRED_COLUMNS - columns
        if missing:
            raise ValueError(f"Reference dataset is missing columns: {sorted(missing)}")

        patients = []
        for index, row in enumerate(reader, start=1):
            if index > limit:
                break
            patients.append(_map_row(row, index))
        return patients


def get_demo_patient(patient_id: str) -> dict | None:
    """Return one reference row by its stable demo identifier."""
    return next(
        (patient for patient in load_demo_patients() if patient["id"] == patient_id),
        None,
    )


def build_reference_analysis_input(patient: dict) -> str:
    """Create the bounded source text for a doctor-requested AI summary.

    The dataset's disease field is a source label, not an AI conclusion. The
    resulting text is deliberately limited to this one reference record and is
    never persisted as a MedSync patient history.
    """
    symptom_lines = "\n".join(
        f"- {name.replace('_', ' ').title()}: {value}"
        for name, value in patient["symptoms"].items()
    )
    return (
        "KAGGLE CLINICAL REFERENCE DATA - NOT A REGISTERED PATIENT\n"
        "Use only the fields below. Organize them for physician review; do not "
        "infer a diagnosis, prognosis, treatment, or recommendation. Treat the "
        "recorded disease as a dataset label rather than an AI diagnosis.\n\n"
        f"Reference ID: {patient['reference_id']}\n"
        f"Recorded disease label: {patient['disease']}\n"
        f"Age: {patient['age']}\n"
        f"Gender: {patient['gender']}\n"
        f"Blood pressure: {patient['blood_pressure']}\n"
        f"Cholesterol level: {patient['cholesterol_level']}\n"
        f"Outcome variable: {patient['outcome']}\n"
        f"Symptoms:\n{symptom_lines}"
    )


def find_symptom_pattern_matches(symptoms: dict[str, str]) -> list[dict]:
    """Return matching reference records for future AI-assisted review.

    This is a read-only reference lookup, not a diagnostic or treatment
    recommendation. A future AI workflow can call this boundary to add
    source-labelled pattern context while leaving clinical decisions with the
    reviewing doctor.
    """
    requested = {
        key: str(value).strip().lower()
        for key, value in symptoms.items()
        if key in _SYMPTOM_FIELDS and value is not None
    }
    if not requested:
        return []

    matches = []
    for patient in load_demo_patients():
        matched_fields = [
            key
            for key, value in requested.items()
            if patient["symptoms"][key].strip().lower() == value
        ]
        if matched_fields:
            matches.append({
                "reference_patient": patient,
                "matched_symptoms": matched_fields,
                "is_reference_data": True,
            })
    return matches
