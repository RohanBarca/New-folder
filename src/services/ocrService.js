/**
 * OCR & Medical Document Service for MedSync
 * --------------------------------------------
 * Securely communicates with the MedSync FastAPI backend:
 *   - POST /api/patients/:patientId/documents — Uploads document & extracts OCR text
 *   - GET  /api/patients/:patientId/documents — Retrieves patient document history
 *   - GET  /api/documents/:documentId/ocr     — Retrieves stored OCR result
 * 
 * Note: Never calls OCR.space directly from the browser; all API keys and upstream
 * calls are managed securely by the backend server.
 */

import { API_BASE } from './api';

export const ocrService = {
  /**
   * Uploads and extracts text from a medical document, associating it with the patient record.
   * 
   * @param {File} file - PDF, JPG, JPEG, or PNG document (max 5 MB)
   * @param {string} [patientId] - UUID of the registered patient
   * @param {string} [documentType="OPD Prescription"] - Type of medical document
   * @returns {Promise<{ success: boolean, text: string, document_id?: string, patient_id?: string, processing_time?: number, error?: string, is_empty?: boolean }>}
   */
  async extractText(file, patientId = null, documentType = "OPD Prescription") {
    if (!file) {
      return {
        success: false,
        text: '',
        error: 'No file provided for text extraction.'
      };
    }

    // Resolve patientId from parameter or sessionStorage
    const resolvedPatientId = patientId || sessionStorage.getItem('medsync_patient_id');

    if (!resolvedPatientId) {
      return {
        success: false,
        text: '',
        error: 'Patient ID is missing. Please complete patient registration first so documents can be linked to your profile.'
      };
    }

    // Client-side file size validation (5 MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return {
        success: false,
        text: '',
        error: `File size exceeds the 5 MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`
      };
    }

    // Client-side extension validation
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      return {
        success: false,
        text: '',
        error: 'Unsupported file format. Please upload a PDF, JPG, JPEG, or PNG document.'
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType || 'Medical Document');

    try {
      // Calls the patient document upload endpoint
      const response = await fetch(`${API_BASE}/api/patients/${resolvedPatientId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.detail) {
            errorMsg = Array.isArray(errData.detail)
              ? errData.detail[0]?.msg || errData.detail[0]
              : errData.detail;
          } else if (errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}

        return {
          success: false,
          text: '',
          error: errorMsg
        };
      }

      const data = await response.json();

      // Check OCR status
      const isFailed = data.ocr_status === 'failed';
      const extractedText = data.extracted_text || '';

      return {
        success: !isFailed,
        text: extractedText,
        document_id: data.document_id,
        patient_id: data.patient_id,
        filename: data.filename,
        document_type: data.document_type,
        ocr_status: data.ocr_status,
        processing_time: (data.processing_time_ms || 0) / 1000,
        is_empty: extractedText.trim().length === 0,
        error: isFailed ? (data.error || 'Failed to extract text with OCR.') : undefined,
      };

    } catch (err) {
      return {
        success: false,
        text: '',
        error: 'Unable to connect to the MedSync backend. Please verify the backend server is running.'
      };
    }
  },

  /**
   * Retrieves all documents and OCR results for a patient.
   * 
   * @param {string} patientId - UUID of the patient
   * @returns {Promise<Array>}
   */
  async getPatientDocuments(patientId) {
    if (!patientId) return [];
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/documents`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Retrieves the stored OCR result for a document.
   * 
   * @param {string} documentId - UUID of the document
   * @returns {Promise<Object|null>}
   */
  async getDocumentOcr(documentId) {
    if (!documentId) return null;
    try {
      const res = await fetch(`${API_BASE}/api/documents/${documentId}/ocr`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
};

export default ocrService;
