-- Add WebAuthn credential fields to biometric_profiles
-- credential_id: the FIDO2 credential ID returned after registration
-- public_key: the attestation object (COSE key) for assertion verification

ALTER TABLE biometric_profiles
  ADD COLUMN IF NOT EXISTS credential_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Index for fast lookup by credential_id during authentication
CREATE INDEX IF NOT EXISTS idx_biometric_profiles_credential_id
  ON biometric_profiles (credential_id)
  WHERE credential_id IS NOT NULL;
