-- ============================================================
-- UPI Payment System + Registration Approval Flow
-- Created: 2026-06-29
-- ============================================================

-- 1. Add payment + registration window fields to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS payment_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coordinator_upi_id text,
  ADD COLUMN IF NOT EXISTS coordinator_upi_name text;

-- Note: payment_amount, registration_opens_at, registration_closes_at already exist

-- 2. Add rejection_reason to registrations
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Extend registrations status to include 'payment_pending'
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'approved'::text,
    'rejected'::text,
    'payment_pending'::text
  ]));

-- 4. Create payment_submissions table
CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id text NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  utr_number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  verified_at timestamptz,
  verified_by_event text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.payment_submissions OWNER TO postgres;

-- Enable RLS on payment_submissions
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can see their own submissions
DROP POLICY IF EXISTS "Students see own payment submissions" ON public.payment_submissions;
CREATE POLICY "Students see own payment submissions"
  ON public.payment_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Students can insert their own submissions  
DROP POLICY IF EXISTS "Students insert own payment submissions" ON public.payment_submissions;
CREATE POLICY "Students insert own payment submissions"
  ON public.payment_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can select (coordinator checks by event_id in app logic)
DROP POLICY IF EXISTS "Authenticated can read payment submissions" ON public.payment_submissions;
CREATE POLICY "Authenticated can read payment submissions"
  ON public.payment_submissions FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update (coordinator verifies)
DROP POLICY IF EXISTS "Authenticated can update payment submissions" ON public.payment_submissions;
CREATE POLICY "Authenticated can update payment submissions"
  ON public.payment_submissions FOR UPDATE
  TO authenticated
  USING (true);

-- 5. Enable realtime on payment_submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_submissions;

COMMENT ON TABLE public.payment_submissions IS 'Stores student UPI payment UTR submissions for coordinator verification';
COMMENT ON COLUMN public.payment_submissions.utr_number IS 'UPI Transaction Reference number submitted by student';
COMMENT ON COLUMN public.payment_submissions.verified_at IS 'Timestamp when coordinator verified the payment';
COMMENT ON COLUMN public.payment_submissions.verified_by_event IS 'Event title of verifying coordinator session';
