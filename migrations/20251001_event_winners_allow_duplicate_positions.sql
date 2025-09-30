-- Migration: Allow multiple winners to share the same position
-- Purpose: Remove the unique index on (event_id, position) which prevented storing
-- multiple winners at the same numeric position for an event (e.g. multiple 1st places).
-- Drop the unique index/constraint if present (idempotent)
DO $$
BEGIN
  -- Try drop as an index (common case)
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'uq_event_winners_event_position'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.uq_event_winners_event_position';
  END IF;

  -- Also try drop as a table constraint just in case it was created as one
  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE con.conname = 'uq_event_winners_event_position' AND rel.relname = 'event_winners'
  ) THEN
    EXECUTE 'ALTER TABLE public.event_winners DROP CONSTRAINT IF EXISTS uq_event_winners_event_position';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: log a notice and continue
  RAISE NOTICE 'Could not remove uq_event_winners_event_position: %', SQLERRM;
END$$;

-- Optional: create a non-unique index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_event_winners_event_position ON public.event_winners (event_id, position);

-- Safety check: list indexes can be run after deployment to confirm state.
