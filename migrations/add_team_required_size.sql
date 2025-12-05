-- Add team_required_size column to events table
-- This column allows admins to specify an exact team size requirement per event
-- When set, teams must have exactly this many members
-- When NULL, teams can have 2 to team_max_members (or 50) members

ALTER TABLE events ADD COLUMN team_required_size INTEGER DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN events.team_required_size IS 'Exact number of team members required (overrides flexible range when set)';
