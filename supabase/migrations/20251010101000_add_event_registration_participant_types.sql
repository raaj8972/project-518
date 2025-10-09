-- Supabase migration: add registration_participant_types to events
-- Adds per-event array of participant types (text[])

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT NULL;

-- Note: once applied, refresh Supabase Table Editor and restart your app if necessary.
