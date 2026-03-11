-- Migration: Add UUID Team references for Annual Sports Matches
-- Resolves type mismatches where legacy teams used int8 but Annual Registrations use UUIDs.

ALTER TABLE public.sports_matches 
ADD COLUMN IF NOT EXISTS annual_team_a_id uuid REFERENCES public.annual_sports_registrations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS annual_team_b_id uuid REFERENCES public.annual_sports_registrations(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
