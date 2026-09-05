"""
MedSync — FHIR R4 API Router
------------------------------
Endpoint:
  GET /api/patients/{patient_id}/fhir — Generate and return a compliant HL7 FHIR R4 Bundle.
"""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.fhir_service import FhirService
from ..core.security import validate_patient_id, verify_patient_exists

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patients/{patient_id}/fhir", tags=["FHIR R4 Interoperability"])


@router.get("")
async def get_patient_fhir_bundle(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """
    Exports all available patient clinical facts as a standard HL7 FHIR Release 4 (R4) Bundle.
    
    Includes:
      - Patient
      - Condition (chief complaint, past medical history, symptoms)
      - MedicationStatement
      - AllergyIntolerance
      - Observation (vitals, lab findings, AYUSH Dashavidha Pariksha)
      - Procedure (surgeries)
      - DiagnosticReport (OPD medical documents)
      - Encounter (chat sessions)
      
    SAFETY:
      - Strictly derived from stored patient records.
      - Zero fabricated clinical facts.
    """
    uid = validate_patient_id(patient_id)
    verify_patient_exists(db, uid)

    try:
        bundle = FhirService.generate_patient_bundle(db, uid)
        return bundle
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Error generating FHIR Bundle: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate FHIR Bundle."
        )
