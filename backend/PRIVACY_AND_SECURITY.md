# MedSync — Privacy Foundation & Security Configuration

## Overview
This document outlines the technical privacy controls, data handling boundaries, security architecture, and DPDP-oriented (Digital Personal Data Protection) design principles implemented in MedSync.

> [!IMPORTANT]
> **Legal Disclaimer**: The inclusion of technical controls, encryption, audit trails, and consent enforcement mechanisms is designed to support DPDP-oriented privacy requirements and consent-based healthcare data handling. This technical architecture does NOT constitute, replace, or guarantee legal compliance or certification under any specific jurisdiction's data privacy laws.

---

## 1. Consent-Based Data Processing Architecture
- **Non-Automatic Consent**: Consent is never granted automatically. Patients must explicitly grant consent for specific processing types.
- **Granular Consent Types**:
  - `data_collection`: Demographics & basic profile storage
  - `medical_history`: AYUSH and clinical history collection
  - `document_processing`: Medical record storage and OCR text extraction
  - `ai_processing`: Clinical intake chat and final summary generation
  - `voice_processing`: Speech synthesis and voice transcription
  - `doctor_access`: Attending physician record review
  - `abdm_sharing`: Ayushman Bharat Digital Mission record sharing
- **Immutable Audit Trail on Revocation**: Revoking consent sets `status = 'revoked'` and records the `revoked_at` timestamp. Historical records are preserved for audit and legal compliance.
- **`has_consent` Service**: Evaluates active consent state (`GRANTED`, `REVOKED`, `NOT PROVIDED`) before sensitive operations.

---

## 2. Security & Credentials Management
- **Environment Isolation**: Secrets, API keys (e.g. `GROQ_API_KEY`, `OCR_SPACE_API_KEY`), and database credentials reside exclusively in `backend/.env`.
- **Git Protection**: `backend/.env` and `*.env` files are strictly listed in `.gitignore`.
- **Placeholder Templates**: `.env.example` contains placeholders only and no actual secret keys.
- **Zero API Key Leakage**: API keys, bearer tokens, and credentials are server-side only and never returned in API payloads or error responses.

---

## 3. Data Minimization & Logging Restrictions
- **Automatic Audit Redaction**: The audit logging service automatically redacts keys containing `password`, `secret`, `token`, `key`, `authorization`, etc.
- **No Raw Full Medical Dumps in Metadata**: Audit entries record actions and resource identifiers, not entire raw clinical record payloads.
- **Sanitized Error Messaging**: Internal stack traces and database error diagnostics are logged server-side only and suppressed from client-facing HTTP responses.

---

## 4. Session Expiration & Temp File Lifecycle
- **Session Timeout**: Inactivity session expiration configured via `SESSION_TIMEOUT_MINUTES=60` in configuration.
- **Temporary File Cleanup**: Uploaded files processed for OCR are temporarily stored in `uploads/` with sanitized filenames and cleaned up after processing when applicable.
- **No Automatic Patient Record Erasure**: Systems maintain clinical integrity while respecting consent revocation boundaries. Patient data is not deleted automatically without explicit administrative action.

---

## 5. Role-Based Access Control (RBAC) & Patient Isolation
- **Supported Roles**:
  - `patient`: Access restricted strictly to own profile, sessions, consents, and documents.
  - `doctor`: Clinical review of patient histories, summaries, and OPD documents.
  - `admin`: Infrastructure health, configuration, and audit trail inspection.
- **Cross-Patient Isolation**: All patient endpoints validate UUID format and verify that requested resources belong to the target patient.
