-- Supabase migration: add per-event default registration mode
-- Adds `registration_default_mode` to the events table so admin UI changes have a backing column.
-- Values allowed: 'individual' or 'team'. Default is 'individual'.

ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual';

-- Add a check constraint to ensure only allowed values are stored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'events' AND c.conname = 'events_registration_default_mode_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_registration_default_mode_check CHECK (registration_default_mode IN ('individual', 'team'));
  END IF;
END$$;
