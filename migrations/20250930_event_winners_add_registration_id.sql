-- Migration: add registration_id to event_winners so winners can reference a participant registration
-- Run this in your Supabase SQL editor or via psql against your database

BEGIN;

ALTER TABLE IF EXISTS public.event_winners
  ADD COLUMN IF NOT EXISTS registration_id text;

-- Optional FK constraint to link to registrations.id (text). Use ON DELETE SET NULL so historic winners remain if a registration is removed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'event_winners_registration_id_fkey' AND t.relname = 'event_winners'
  ) THEN
    ALTER TABLE public.event_winners
      ADD CONSTRAINT event_winners_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_event_winners_registration_id ON public.event_winners (registration_id);

COMMIT;
