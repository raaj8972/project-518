-- Migration: Add event_rounds and registration_rounds tables
-- Run with: node db_check.js (or any Supabase admin approach)

-- Create event_rounds table
CREATE TABLE IF NOT EXISTS public.event_rounds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL,
  round_number integer NOT NULL,
  name text NOT NULL DEFAULT 'Round 1',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, round_number)
);

-- Create registration_rounds table
CREATE TABLE IF NOT EXISTS public.registration_rounds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id text NOT NULL,
  round_id uuid NOT NULL REFERENCES public.event_rounds(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'disqualified')),
  prize_rank text,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registration_id, round_id)
);

-- Enable RLS
ALTER TABLE public.event_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_rounds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Registered participants can view event rounds" ON public.event_rounds;
DROP POLICY IF EXISTS "Registered participants can view round statuses" ON public.registration_rounds;
DROP POLICY IF EXISTS "Service role can manage event rounds" ON public.event_rounds;
DROP POLICY IF EXISTS "Service role can manage registration rounds" ON public.registration_rounds;
DROP POLICY IF EXISTS "Anon can read event rounds for registered events" ON public.event_rounds;
DROP POLICY IF EXISTS "Anon can read round statuses" ON public.registration_rounds;

-- RLS: Authenticated users with approved registration for the event can read rounds
CREATE POLICY "Registered participants can view event rounds"
  ON public.event_rounds FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.event_id = event_rounds.event_id
        AND r.user_id = auth.uid()
        AND r.status = 'approved'
    )
  );

-- RLS: Authenticated users with approved registration can read round statuses
CREATE POLICY "Registered participants can view round statuses"
  ON public.registration_rounds FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_rounds er
      JOIN public.registrations r ON r.event_id = er.event_id
      WHERE er.id = registration_rounds.round_id
        AND r.user_id = auth.uid()
        AND r.status = 'approved'
    )
  );

-- RLS: Service role full access for coordinator operations
CREATE POLICY "Service role can manage event rounds"
  ON public.event_rounds FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage registration rounds"
  ON public.registration_rounds FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_rounds;
