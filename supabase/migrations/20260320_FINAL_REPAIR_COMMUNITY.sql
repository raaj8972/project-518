-- ==========================================
-- FINAL REPAIR SCRIPT FOR FEST COMMUNITY (V3)
-- ==========================================
-- This script FORCES a consistent schema by dropping conflicting tables.
-- It resolves:
-- 1. Column "id" not found in "student_xp"
-- 2. PGRST200 Relationship errors
-- 3. Missing columns in Profiles and Teams
-- ==========================================

DO $$ 
BEGIN
  -- 1. CLEAN UP CONFLICTING TABLES (Fresh Start)
  DROP TABLE IF EXISTS public.shoutouts CASCADE;
  DROP TABLE IF EXISTS public.student_xp CASCADE;
  DROP TABLE IF EXISTS public.student_activity_log CASCADE;
  DROP TABLE IF EXISTS public.profile_likes CASCADE;

  -- 2. ENSURE PROFILES HAS ALL MODERN COLUMNS
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aura_color TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS participant_type TEXT;

  -- 3. FIX TEAMS TABLE
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='code') THEN
      ALTER TABLE public.teams ADD COLUMN code TEXT UNIQUE;
      UPDATE public.teams SET code = 'TEAM-' || id::text WHERE code IS NULL;
      ALTER TABLE public.teams ALTER COLUMN code SET NOT NULL;
    END IF;
  ELSE
    CREATE TABLE public.teams (
      id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_id    TEXT NOT NULL,
      name        TEXT NOT NULL,
      code        TEXT UNIQUE NOT NULL,
      created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;

  -- 4. REBUILD COMMUNITY TABLES WITH UNIFIED SCHEMA
  CREATE TABLE public.shoutouts (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message       TEXT NOT NULL CHECK (char_length(message) <= 150),
    is_anonymous  BOOLEAN DEFAULT true,
    is_approved   BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE public.student_xp (
    id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp_total    INTEGER DEFAULT 0,
    tier        TEXT DEFAULT 'bronze',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE public.student_activity_log (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,
    xp_earned   INTEGER DEFAULT 0,
    meta        JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE public.profile_likes (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    liker_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(liker_id, profile_id)
  );
END $$;

-- 5. RE-CREATE XP FUNCTION
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action  TEXT,
  p_xp      INTEGER,
  p_meta    JSONB DEFAULT '{}'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  INSERT INTO public.student_activity_log (user_id, action, xp_earned, meta)
  VALUES (p_user_id, p_action, p_xp, p_meta);

  INSERT INTO public.student_xp (id, xp_total, tier)
  VALUES (p_user_id, p_xp, 'bronze')
  ON CONFLICT (id) DO UPDATE SET
    xp_total = public.student_xp.xp_total + p_xp,
    updated_at = NOW();

  SELECT xp_total INTO new_xp FROM public.student_xp WHERE id = p_user_id;
  
  UPDATE public.student_xp SET tier = 
    CASE 
      WHEN new_xp >= 1000 THEN 'elite'
      WHEN new_xp >= 500 THEN 'gold'
      WHEN new_xp >= 100 THEN 'silver'
      ELSE 'bronze'
    END
  WHERE id = p_user_id;
END;
$$;

-- 6. RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Approved shoutouts read" ON public.shoutouts;
CREATE POLICY "Approved shoutouts read" ON public.shoutouts FOR SELECT USING (is_approved = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Any auth user can post shoutout" ON public.shoutouts;
CREATE POLICY "Any auth user can post shoutout" ON public.shoutouts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "XP read access" ON public.student_xp;
CREATE POLICY "XP read access" ON public.student_xp FOR SELECT USING (true);

-- 7. REALTIME ENABLEMENT
DO $$
BEGIN
  -- Attempt to add tables to publication safely
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 8. SAMPLE DATA (SEEDS)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM public.award_xp(v_user_id, 'initial_seed', 50, '{"note": "System Seed"}');
    
    INSERT INTO public.shoutouts (user_id, message, is_anonymous, is_approved)
    VALUES (v_user_id, 'RICO Fest is officially LIVE! Let the games begin 🚀', false, true);
    
    INSERT INTO public.shoutouts (user_id, message, is_anonymous, is_approved)
    VALUES (v_user_id, 'Shout out to the dev team for this amazing dashboard!', true, true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
