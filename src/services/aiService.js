/**
 * MedSync — AI Service (Frontend)
 *
 * Handles AI Document Summarization and AI Clinical History Chatbot
 * using Groq API via FastAPI backend.
 *
 * SECURITY:
 *  - This frontend module NEVER holds, transmits, or exposes the Groq API key.
 *  - All requests are securely routed to the backend at /api/* endpoints.
 */

const aiService = {
  /**
   * Sends raw text from medical records to /api/summarize
   */
  async summarize(text) {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Server error: ${response.status}`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the backend server. Please verify the backend is running.',
      };
    }
  },

  /**
   * Sends raw OCR text to /api/summarize
   */
  async summarizeMedicalDocument(ocrText) {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocr_text: ocrText }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Server error: ${response.status}`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the AI backend. Please verify the server is running on port 8000.',
      };
    }
  },

  /**
   * Starts a new AI clinical history-taking chatbot session via /api/chat/start
   */
  async startChat(context = {}) {
    try {
      const patientId = context.patient_id || sessionStorage.getItem('medsync_patient_id');
      const payload = {
        ...context,
        patient_id: patientId || undefined
      };

      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Server error: ${response.status}`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'Unable to connect to AI chatbot backend.',
      };
    }
  },

  /**
   * Sends patient answer to active session via /api/chat/message
   */
  async sendChatMessage(sessionId, message, language = null, patientId = null) {
    try {
      const resolvedPatientId = patientId || sessionStorage.getItem('medsync_patient_id');
      const payload = { session_id: sessionId, message };
      if (language) {
        payload.language = language;
      }
      if (resolvedPatientId) {
        payload.patient_id = resolvedPatientId;
      }

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Server error: ${response.status}`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: "I'm having trouble processing that. Please try again.",
      };
    }
  },

  /**
   * Retrieves chronological messages for a chat session from PostgreSQL.
   */
  async getChatSessionMessages(sessionId, patientId = null) {
    try {
      const resolvedPatientId = patientId || sessionStorage.getItem('medsync_patient_id');
      let url = `/api/chat/sessions/${sessionId}/messages`;
      if (resolvedPatientId) {
        url += `?patient_id=${encodeURIComponent(resolvedPatientId)}`;
      }

      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Retrieves all chat sessions for a patient from PostgreSQL.
   */
  async getPatientChatSessions(patientId) {
    try {
      const res = await fetch(`/api/patients/${patientId}/chat-sessions`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Retrieves the stored AYUSH history for a patient from PostgreSQL.
   */
  async getPatientAyushHistory(patientId) {
    try {
      const res = await fetch(`/api/patients/${patientId}/ayush-history`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.ayush_history || null;
    } catch {
      return null;
    }
  },

  /**
   * Updates language of active session mid-conversation via PATCH /api/chat/session/{session_id}/language
   */
  async updateSessionLanguage(sessionId, language) {
    try {
      const response = await fetch(`/api/chat/session/${sessionId}/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Server error: ${response.status}`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: "Unable to update session language.",
      };
    }
  },

  /**
   * Checks connectivity to the backend Groq AI service.
   */
  async checkHealth() {
    try {
      const response = await fetch('/api/groq/health');
      return await response.json();
    } catch {
      return {
        success: false,
        error: 'Backend AI service unreachable.',
      };
    }
  },

  // ── Batch 2: Final Patient Summary Engine ─────────────────────────────────

  /**
   * Generates a new Final Patient Summary from ALL persisted patient data.
   * Calls POST /api/ai/final-summary with the patient's UUID.
   *
   * Returns the full structured summary JSON from Groq, plus metadata.
   * On failure: returns { success: false, error: "..." }
   *
   * SECURITY: Never exposes the Groq API key — all calls are server-side.
   */
  async generateFinalSummary(patientId) {
    try {
      const response = await fetch(`/api/patients/${patientId}/summary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `AI summary generation failed (${response.status}).`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the AI Summary backend. Please verify the server is running.',
      };
    }
  },

  /**
   * Retrieves the most recently generated Final Patient Summary for a patient.
   * Calls GET /api/patients/{patientId}/summary
   *
   * Returns { success: true, summary_record: { summary_json, model_name, version, created_at, ... } }
   * Returns { success: false, error: "No AI summary generated yet" } if none exists.
   */
  async getLatestSummary(patientId) {
    try {
      const response = await fetch(`/api/patients/${patientId}/summary`);
      const data = await response.json();

      if (response.status === 404) {
        return { success: false, error: data.detail || 'No summary generated yet.' };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Failed to retrieve summary (${response.status}).`,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'Unable to retrieve patient summary.',
      };
    }
  },

  /**
   * Retrieves metadata for all stored summary versions for a patient.
   * Calls GET /api/patients/{patientId}/summary/versions
   *
   * Returns { patient_id, total_versions, versions: [...] }
   */
  async getSummaryVersions(patientId) {
    try {
      const response = await fetch(`/api/patients/${patientId}/summary/versions`);
      if (!response.ok) return { total_versions: 0, versions: [] };
      return await response.json();
    } catch {
      return { total_versions: 0, versions: [] };
    }
  },

  async getRedFlags(patientId) {
    try {
      const response = await fetch(`/api/patients/${patientId}/red-flags`);
      if (!response.ok) return { success: false, red_flags: [] };
      return await response.json();
    } catch {
      return { success: false, red_flags: [] };
    }
  },
};

export default aiService;

