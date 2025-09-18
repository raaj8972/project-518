-- Add optional map_url columns to events and schedule_events
-- Idempotent and safe to run multiple times

-- Events: map_url for precise map deep links
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Schedule events: map_url for unlinked items or overrides
ALTER TABLE IF EXISTS public.schedule_events
  ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Optional: basic comments
COMMENT ON COLUMN public.events.map_url IS 'Optional map URL for the event venue (e.g., Google Maps link)';
COMMENT ON COLUMN public.schedule_events.map_url IS 'Optional map URL for the schedule entry venue (used when not linked to an event)';
