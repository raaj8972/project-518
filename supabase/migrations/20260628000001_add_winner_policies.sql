-- Migration: Add selective public and participant policies for event rounds and winner profiles
-- Run with: npx supabase db push

-- Drop policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Allow approved participants to read event co-participants" ON public.registrations;
DROP POLICY IF EXISTS "Allow public to read winner registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow anyone to read winners" ON public.registration_rounds;

-- 1. Policy for registered participants to view co-participants in the same event
CREATE POLICY "Allow approved participants to read event co-participants"
  ON public.registrations FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.event_id = registrations.event_id
        AND r.user_id = auth.uid()
        AND r.status = 'approved'
    )
  );

-- 2. Policy for anyone (public/anon) to read winner details from registration_rounds
CREATE POLICY "Allow anyone to read winners"
  ON public.registration_rounds FOR SELECT TO public
  USING (prize_rank IS NOT NULL);

-- 3. Policy for anyone (public/anon) to read winner registrations (name, team, batch, etc.)
CREATE POLICY "Allow public to read winner registrations"
  ON public.registrations FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.registration_rounds rr
      WHERE rr.registration_id = registrations.id
        AND rr.prize_rank IS NOT NULL
    )
  );
