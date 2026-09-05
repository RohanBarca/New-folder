/**
 * MedSync — Patient Service (Frontend)
 * ----------------------------------------
 * Consolidates all patient-specific API calls for the Patient Dashboard.
 *
 * SECURITY:
 *  - All patient_id values come from sessionStorage (set by the backend during registration).
 *  - No raw patient_id is accepted from URL query params.
 *  - No API keys are exposed or stored in this module.
 *  - Requests include Bearer authorization tokens.
 *
 * API_BASE defaults to '' (relative path) so Vite proxy routes to localhost:8000.
 */

const API_BASE = '';

function getHeaders(extraHeaders = {}) {
  const token = sessionStorage.getItem('medsync_token');
  const patientId = sessionStorage.getItem('medsync_patient_id');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (patientId) {
    headers['X-Patient-Id'] = patientId;
  }
  return headers;
}

const patientService = {
  /**
   * Fetches the patient profile record.
   * GET /api/patients/{patientId}
   */
  async getPatient(patientId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { success: true, patient: data };
    } catch {
      return { success: false, error: 'Unable to load patient profile.' };
    }
  },

  /**
   * Fetches all medical documents for a patient.
   * GET /api/patients/{patientId}/documents
   */
  async getDocuments(patientId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/documents`, {
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, documents: [], error: `HTTP ${res.status}` };
      const data = await res.json();
      return { success: true, documents: Array.isArray(data) ? data : [] };
    } catch {
      return { success: false, documents: [], error: 'Unable to load medical records.' };
    }
  },

  /**
   * Fetches OCR result for a specific document.
   * GET /api/documents/{documentId}/ocr
   */
  async getDocumentOcr(documentId) {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${documentId}/ocr`, {
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return { success: true, ...(await res.json()) };
    } catch {
      return { success: false, error: 'Unable to load OCR result.' };
    }
  },

  /**
   * Fetches all chat sessions for a patient.
   * GET /api/patients/{patientId}/chat-sessions
   */
  async getChatSessions(patientId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/chat-sessions`, {
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, sessions: [], error: `HTTP ${res.status}` };
      const data = await res.json();
      const sessions = Array.isArray(data) ? data : (data.sessions || []);
      return { success: true, sessions };
    } catch {
      return { success: false, sessions: [], error: 'Unable to load interview sessions.' };
    }
  },

  /**
   * Fetches AYUSH / Dashavidha Pariksha history.
   * GET /api/patients/{patientId}/ayush-history
   */
  async getAyushHistory(patientId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/ayush-history`, {
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, ayush_history: null, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { success: true, ayush_history: data.ayush_history || null };
    } catch {
      return { success: false, ayush_history: null, error: 'Unable to load AYUSH history.' };
    }
  },

  /**
   * Fetches the latest stored AI final summary (does NOT generate a new one).
   * GET /api/patients/{patientId}/summary
   */
  async getSummary(patientId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/summary`, {
        headers: getHeaders(),
      });
      if (res.status === 404) return { success: false, error: 'No summary generated yet.' };
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { success: true, ...data };
    } catch {
      return { success: false, error: 'Unable to load health summary.' };
    }
  },

  /**
   * Fetches all consent records for a patient.
   * GET /api/patients/{patientId}/consents
   */
  async getConsents(patientId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/consents`, {
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, consents: [], error: `HTTP ${res.status}` };
      const data = await res.json();
      const consents = Array.isArray(data) ? data : (data.consents || []);
      return { success: true, consents };
    } catch {
      return { success: false, consents: [], error: 'Unable to load consent records.' };
    }
  },

  /**
   * Grants a consent for a patient.
   * POST /api/patients/{patientId}/consents
   */
  async grantConsent(patientId, consentType, purpose) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/consents`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ consent_type: consentType, purpose, status: 'granted' }),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return { success: true, ...(await res.json()) };
    } catch {
      return { success: false, error: 'Unable to grant consent.' };
    }
  },

  /**
   * Revokes a specific consent record.
   * POST /api/patients/{patientId}/consents/{consentId}/revoke
   */
  async revokeConsent(patientId, consentId) {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/consents/${consentId}/revoke`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return { success: true, ...(await res.json()) };
    } catch {
      return { success: false, error: 'Unable to revoke consent.' };
    }
  },

  /**
   * Loads all dashboard data in parallel for a single patient.
   * Returns an object keyed by data type.
   */
  async loadDashboard(patientId) {
    const [profileResult, documentsResult, sessionsResult, ayushResult, summaryResult, consentsResult] =
      await Promise.allSettled([
        this.getPatient(patientId),
        this.getDocuments(patientId),
        this.getChatSessions(patientId),
        this.getAyushHistory(patientId),
        this.getSummary(patientId),
        this.getConsents(patientId),
      ]);

    return {
      profile: profileResult.status === 'fulfilled' ? profileResult.value : { success: false, error: 'Failed' },
      documents: documentsResult.status === 'fulfilled' ? documentsResult.value : { success: false, documents: [] },
      sessions: sessionsResult.status === 'fulfilled' ? sessionsResult.value : { success: false, sessions: [] },
      ayush: ayushResult.status === 'fulfilled' ? ayushResult.value : { success: false, ayush_history: null },
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value : { success: false, error: 'Failed' },
      consents: consentsResult.status === 'fulfilled' ? consentsResult.value : { success: false, consents: [] },
    };
  },
};

export default patientService;
