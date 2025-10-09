-- Supabase migration: add registration_form_fields to events
-- Adds per-event JSONB column for registration form field overrides

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT NULL;

-- NOTE: After applying this, refresh the Supabase Table Editor for `events` and restart your app if necessary.
