-- Add motion poster and coordinator fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS motion_poster_url text NULL,
ADD COLUMN IF NOT EXISTS coordinator_name text NULL,
ADD COLUMN IF NOT EXISTS coordinator_phone text NULL;

-- Optional: basic length constraint for phone (non-strict to avoid locale issues)
-- ALTER TABLE public.events
--   ADD CONSTRAINT events_coordinator_phone_len CHECK (coordinator_phone IS NULL OR length(coordinator_phone) BETWEEN 7 AND 20);

-- Comment for documentation
COMMENT ON COLUMN public.events.motion_poster_url IS 'Public URL to a short looping video used as motion poster on event card front.';
COMMENT ON COLUMN public.events.coordinator_name IS 'Primary event coordinator name shown on event details.';
COMMENT ON COLUMN public.events.coordinator_phone IS 'Primary event coordinator phone shown on event details.';