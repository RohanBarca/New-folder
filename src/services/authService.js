/**
 * MedSync — Authentication Service (Frontend)
 * ---------------------------------------------
 * Handles Mobile Number SMS OTP Authentication via MSG91 backend.
 *
 * SECURITY:
 *  - Secrets and MSG91 API keys are NEVER exposed to the frontend.
 *  - Tokens and session identifiers are stored in sessionStorage.
 *  - Requests include Bearer tokens in Authorization headers.
 */

import { API_BASE } from './api';

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { detail: 'Unexpected server response.' };
  }
}

export const authService = {
  async loginWithPhone(phone) {
    try {
      const normalizedPhone = phone?.trim();
      const res = await fetch(`${API_BASE}/api/auth/mobile/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Unable to continue with this phone number.',
        };
      }

      if (data.access_token) sessionStorage.setItem('medsync_token', data.access_token);
      if (data.user?.patient_id) sessionStorage.setItem('medsync_patient_id', data.user.patient_id);
      if (data.user?.patient_name) sessionStorage.setItem('medsync_patient_name', data.user.patient_name);
      if (data.user?.phone_masked) sessionStorage.setItem('medsync_phone_masked', data.user.phone_masked);

      return {
        success: true,
        authenticated: true,
        user: data.user,
        access_token: data.access_token,
      };
    } catch {
      return {
        success: false,
        error: 'Unable to sign in with this phone number. Please try again.',
      };
    }
  },

  async getMobileWidgetConfig() {
    const res = await fetch(`${API_BASE}/api/auth/mobile/widget-config`);
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.detail || 'OTP widget is not configured.');
    return data;
  },

  /**
   * Dispatches SMS OTP to an Indian mobile number via backend MSG91 integration.
   * @param {string} phone - 10-digit Indian phone number (or +91...)
   * @returns {Promise<{ success: boolean, request_id?: string, phone_masked?: string, message?: string, error?: string }>}
   */
  async sendMobileOtp(phone) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/mobile/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Failed to send OTP. Please try again.',
        };
      }

      return {
        success: true,
        request_id: data.request_id,
        phone_masked: data.phone_masked,
        message: data.message,
      };
    } catch {
      return {
        success: false,
        error: 'Unable to reach MedSync server. Please check your network connection.',
      };
    }
  },

  /**
   * Verifies SMS OTP and establishes an authenticated session.
   * @param {string} phone - Mobile number
   * @param {string} otp - 4 or 6-digit OTP code
   * @param {string} requestId - Request ID returned by sendMobileOtp
   * @returns {Promise<{ success: boolean, user?: object, access_token?: string, error?: string }>}
   */
  async verifyMobileOtp(phone, otp, requestId = '') {
    try {
      const res = await fetch(`${API_BASE}/api/auth/mobile/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp,
          request_id: requestId || undefined,
        }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Invalid or expired OTP. Please try again.',
        };
      }

      // Store authenticated session tokens
      if (data.access_token) {
        sessionStorage.setItem('medsync_token', data.access_token);
      }
      if (data.user?.patient_id) {
        sessionStorage.setItem('medsync_patient_id', data.user.patient_id);
      }
      if (data.user?.patient_name) {
        sessionStorage.setItem('medsync_patient_name', data.user.patient_name);
      }
      if (data.user?.phone_masked) {
        sessionStorage.setItem('medsync_phone_masked', data.user.phone_masked);
      }

      return {
        success: true,
        authenticated: true,
        user: data.user,
        access_token: data.access_token,
      };
    } catch {
      return {
        success: false,
        error: 'Unable to verify OTP with server. Please try again.',
      };
    }
  },

  async verifyMobileWidget(accessToken) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/mobile/verify-widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) return { success: false, error: data.detail || 'Invalid or expired OTP.' };

      if (data.access_token) sessionStorage.setItem('medsync_token', data.access_token);
      if (data.user?.patient_id) sessionStorage.setItem('medsync_patient_id', data.user.patient_id);
      if (data.user?.patient_name) sessionStorage.setItem('medsync_patient_name', data.user.patient_name);
      if (data.user?.phone_masked) sessionStorage.setItem('medsync_phone_masked', data.user.phone_masked);
      return { success: true, authenticated: true, user: data.user, access_token: data.access_token };
    } catch {
      return { success: false, error: 'Unable to verify OTP with server. Please try again.' };
    }
  },

  /**
   * Fetches the current authenticated user identity and linked patient profile.
   * @returns {Promise<{ authenticated: boolean, user?: object, patient?: object }>}
   */
  async getCurrentUser() {
    try {
      const token = sessionStorage.getItem('medsync_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const patientId = sessionStorage.getItem('medsync_patient_id');
      if (patientId) {
        headers['X-Patient-Id'] = patientId;
      }

      const res = await fetch(`${API_BASE}/api/auth/me`, { headers });
      if (!res.ok) {
        return { authenticated: false };
      }
      const data = await res.json();
      return data;
    } catch {
      return { authenticated: false };
    }
  },

  /**
   * Logs out current session and clears storage.
   */
  async logout() {
    try {
      const token = sessionStorage.getItem('medsync_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers });
    } catch {
      // Ignore network errors on logout
    } finally {
      sessionStorage.removeItem('medsync_token');
      sessionStorage.removeItem('medsync_patient_id');
      sessionStorage.removeItem('medsync_patient_name');
      sessionStorage.removeItem('medsync_patient_language');
      sessionStorage.removeItem('medsync_phone_masked');
      sessionStorage.removeItem('medsync_chat_session_id');
    }
  },

  /**
   * Returns authorization header for fetch requests.
   */
  getAuthHeaders() {
    const token = sessionStorage.getItem('medsync_token');
    const patientId = sessionStorage.getItem('medsync_patient_id');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (patientId) {
      headers['X-Patient-Id'] = patientId;
    }
    return headers;
  },
};

export default authService;
