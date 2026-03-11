-- Migration to add council_passcode to security_settings
BEGIN;

ALTER TABLE public.security_settings
ADD COLUMN IF NOT EXISTS council_passcode text;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
