-- Migration: Annual Sports Roster & Display Configuration
-- Adds missing toggle fields for roster rendering and photo requirements

ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS display_teams boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS display_schedule boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS require_leader_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_team_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_player_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_team_individual_photos boolean DEFAULT false;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
