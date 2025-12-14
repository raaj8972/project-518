-- Add team_min_members column to events table
-- This allows setting a minimum team size when using flexible team mode (not exact size)

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS team_min_members INTEGER;

-- Add constraint to ensure min is at least 2 (minimum team size)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_team_min_members_bounds'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_team_min_members_bounds
      CHECK (team_min_members IS NULL OR (team_min_members >= 2 AND team_min_members <= 50));
  END IF;
END $$;

COMMENT ON COLUMN public.events.team_min_members IS 'Minimum team members required for this event when registering as a team; NULL defaults to 2.';
