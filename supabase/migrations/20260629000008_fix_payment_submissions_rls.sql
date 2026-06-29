-- Fix RLS policies on payment_submissions table to allow anon roles (coordinators without Supabase Auth session)
-- to select and update payment submissions.

DROP POLICY IF EXISTS "Authenticated can read payment submissions" ON public.payment_submissions;
CREATE POLICY "Authenticated can read payment submissions"
  ON public.payment_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can update payment submissions" ON public.payment_submissions;
CREATE POLICY "Authenticated can update payment submissions"
  ON public.payment_submissions FOR UPDATE
  TO anon, authenticated
  USING (true);
