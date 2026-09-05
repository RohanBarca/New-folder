/**
 * ABHA (Ayushman Bharat Health Account) Service Mock
 * 
 * In production, this module will connect to the official National Health Authority (NHA)
 * ABDM (Ayushman Bharat Digital Mission) Sandbox / Production APIs (M1/M2/M3).
 * 
 * For this prototype, OTP dispatch and verification are mocked cleanly to allow instant integration.
 */

export const abhaService = {
  /**
   * Request OTP for ABHA Number or ABHA Address
   * @param {string} identifier - 14-digit ABHA Number or ABHA Address (e.g. user@abdm)
   * @param {'number' | 'address'} type - Type of ABHA identifier
   * @returns {Promise<{ success: boolean, message: string, txnId: string }>}
   */
  async sendOtp(identifier, type = 'number') {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const cleaned = identifier ? identifier.trim() : '';

    if (!cleaned) {
      return {
        success: false,
        message: 'Please provide a valid ABHA Number or ABHA Address.'
      };
    }

    if (type === 'number') {
      const digitsOnly = cleaned.replace(/\D/g, '');
      if (digitsOnly.length !== 14) {
        return {
          success: false,
          message: 'ABHA Number must be exactly 14 digits.'
        };
      }
    } else {
      if (!cleaned.includes('@') && !cleaned.toLowerCase().endsWith('.abdm')) {
        // Accept user@abdm or standard abha address pattern
        if (cleaned.length < 3) {
          return {
            success: false,
            message: 'Please enter a valid ABHA Address (e.g. name@abdm).'
          };
        }
      }
    }

    return {
      success: true,
      message: 'OTP has been dispatched to your Aadhaar-linked mobile number.',
      txnId: `ABHA_TXN_${Date.now()}`
    };
  },

  /**
   * Verify the 6-digit OTP
   * @param {string} identifier - ABHA Identifier
   * @param {string} otp - 6 digit string
   * @param {string} txnId - Transaction ID
   * @returns {Promise<{ success: boolean, message: string, abhaProfile?: object }>}
   */
  async verifyOtp(identifier, otp, txnId = '') {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 700));

    const cleanOtp = otp ? otp.trim() : '';

    // Mock validation: 123456 is the prototype test OTP
    if (cleanOtp === '123456') {
      return {
        success: true,
        message: 'ABHA identity verified successfully.',
        abhaProfile: {
          abhaNumber: identifier.includes('@') ? '91-4589-2314-8890' : identifier,
          abhaAddress: identifier.includes('@') ? identifier : `${identifier.slice(0, 6)}@abdm`,
          verifiedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: false,
      message: 'Invalid OTP. Please try again (Hint: Use 123456 for prototype).'
    };
  },

  /**
   * Resend OTP
   * @param {string} identifier
   * @param {'number' | 'address'} type
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async resendOtp(identifier, type = 'number') {
    return this.sendOtp(identifier, type);
  }
};

export default abhaService;
