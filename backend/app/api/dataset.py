"""Read-only API for Kaggle clinical reference records."""

from fastapi import APIRouter, HTTPException, status

from ..services.dataset_service import (
    build_reference_analysis_input,
    get_demo_patient,
    load_demo_patients,
)
from ..services.groq_service import GroqService

router = APIRouter(prefix="/api/dataset", tags=["Clinical Reference Dataset"])


@router.get("/patients")
async def list_dataset_patients():
    """Return the configured sample of reference records, never real patients."""
    try:
        patients = load_demo_patients()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return {
        "total": len(patients),
        "patients": patients,
        "is_reference_data": True,
    }


@router.get("/patients/{patient_id}")
async def get_dataset_patient(patient_id: str):
    """Return one reference record by its stable demo identifier."""
    try:
        patient = get_demo_patient(patient_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference patient not found.")
    return patient


@router.post("/patients/{patient_id}/ai-summary")
async def summarize_dataset_patient(patient_id: str):
    """Generate an ephemeral AI-assisted summary after an explicit doctor action."""
    try:
        patient = get_demo_patient(patient_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference patient not found.")

    result = await GroqService.summarize_medical_records(
        build_reference_analysis_input(patient)
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.get("error", "AI reference summary could not be generated."),
        )

    return {
        "reference_id": patient["reference_id"],
        "summary": result["summary"],
        "model": result.get("model"),
        "is_reference_data": True,
        "requires_doctor_review": True,
        "not_a_diagnosis": True,
    }
