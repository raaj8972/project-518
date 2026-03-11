-- Fix sports_registrations schema and RLS

-- 1. Alter sport_id to text to match sports_seasons (if it isn't already)
ALTER TABLE public.sports_registrations
ALTER COLUMN sport_id TYPE text;

-- 2. Add RLS policy for INSERT (allow anyone to register)
CREATE POLICY "Allow public insert to sports_registrations"
ON public.sports_registrations FOR INSERT
TO public
WITH CHECK (true);

-- 3. Verify other policies exist. Usually SELECT, UPDATE, DELETE are for authenticated admins.
-- This was likely missing because registrations are submitted publicly.
