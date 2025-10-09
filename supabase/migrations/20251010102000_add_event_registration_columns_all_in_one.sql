-- Supabase migration: add all event-level registration columns
-- Adds:
--  - registration_default_mode TEXT DEFAULT 'individual'
--  - registration_participant_types TEXT[] DEFAULT NULL
--  - registration_form_fields JSONB DEFAULT NULL
-- Idempotent: safe to run multiple times.

BEGIN;

-- registration_default_mode
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual';

-- participant types array
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT NULL;

-- per-event registration form fields (jsonb)
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT NULL;

-- Add a check constraint for registration_default_mode if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'events' AND c.conname = 'events_registration_default_mode_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_registration_default_mode_check CHECK (registration_default_mode IN ('individual', 'team'));
  END IF;
END$$;

COMMIT;

-- After running this migration in Supabase Studio (SQL editor) or via CLI, refresh the Table Editor and restart your app (dev server or rebuild) so the client picks up the schema changes.
