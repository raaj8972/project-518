-- Drop map_url columns now that the app no longer uses them
-- Safe-guarded with IF EXISTS to avoid errors if already removed

-- Events table
ALTER TABLE IF EXISTS public.events
  DROP COLUMN IF EXISTS map_url;

-- Schedule events table
ALTER TABLE IF EXISTS public.schedule_events
  DROP COLUMN IF EXISTS map_url;
