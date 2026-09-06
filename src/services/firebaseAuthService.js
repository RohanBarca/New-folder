import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase";

let confirmationResult = null;

export function setupRecaptcha(containerId = "recaptcha-container", callbacks = {}) {
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    containerId,
    {
      size: "normal",
      callback: () => {
        callbacks.onVerified?.();
      },
      "expired-callback": () => {
        window.recaptchaVerifier = null;
        callbacks.onExpired?.();
      },
    }
  );

  return window.recaptchaVerifier;
}

export function resetRecaptcha() {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }
}

export async function sendOTP(phoneNumber) {
  const verifier = setupRecaptcha();

  confirmationResult = await signInWithPhoneNumber(
    auth,
    phoneNumber,
    verifier
  );

  return true;
}

export async function verifyOTP(otp) {
  if (!confirmationResult) {
    throw new Error("Please request an OTP first.");
  }

  const result = await confirmationResult.confirm(otp);

  return result.user;
}

export async function logoutFirebase() {
  await signOut(auth);
}