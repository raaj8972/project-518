-- Database Migration for Student Dashboard Premium Features (Consolidated)

-- ==========================
-- 1. TEAMS TABLE
-- ==========================
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public teams are readable by everyone" ON public.teams;
CREATE POLICY "Public teams are readable by everyone" ON public.teams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ==========================
-- 2. SHOUTOUTS TABLE
-- ==========================
CREATE TABLE IF NOT EXISTS public.shoutouts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  is_approved   BOOLEAN DEFAULT FALSE,
  is_anonymous  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved shoutouts are readable by everyone" ON public.shoutouts;
CREATE POLICY "Approved shoutouts are readable by everyone" ON public.shoutouts
  FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can submit shoutouts" ON public.shoutouts;
CREATE POLICY "Users can submit shoutouts" ON public.shoutouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================
-- 3. LINKING REGISTRATIONS TO TEAMS
-- ==========================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='registrations' AND column_name='team_id') THEN
    ALTER TABLE public.registrations ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='annual_sports_registrations' AND column_name='team_id') THEN
    ALTER TABLE public.annual_sports_registrations ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==========================
-- 4. PROFILES EXTENSION
-- ==========================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS participant_type TEXT;

-- ==========================
-- 5. BATCH ACTIVITY PULSE VIEW
-- ==========================
CREATE OR REPLACE VIEW public.batch_activity_pulse AS
  SELECT 
    COALESCE(p.participant_type, p.batch, 'General Participant') as batch,
    COUNT(*) as activity_count,
    MAX(l.created_at) as last_activity
  FROM public.student_activity_log l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY COALESCE(p.participant_type, p.batch, 'General Participant');

-- ==========================
-- 6. REALTIME FOR ALL NEW TABLES
-- ==========================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'teams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'shoutouts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
