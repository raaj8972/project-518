-- Migration: Annual Sports UI Overhaul (Photos, Display Toggles)
-- Adds specific toggles for showing teams/schedule and granular photo requirements for registration.

-- 1. Add Display Toggles to annual_sports_events
ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS display_teams boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS display_schedule boolean DEFAULT true;

-- 2. Add Photo Requirement Toggles
ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS require_leader_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_team_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_player_photo boolean DEFAULT false;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
