DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shoutouts') THEN
    TRUNCATE public.shoutouts CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_likes') THEN
    TRUNCATE public.profile_likes CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_activity_log') THEN
    TRUNCATE public.student_activity_log CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_xp') THEN
    TRUNCATE public.student_xp CASCADE;
  END IF;
END $$;

-- 2. ENHANCE PROFILES TABLE
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS aura_color TEXT,
  ADD COLUMN IF NOT EXISTS background_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 3. PROFILE LIKES SYSTEM
CREATE TABLE IF NOT EXISTS public.profile_likes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(liker_id, profile_id)
);

-- 4. SHOUTOUTS SYSTEM
CREATE TABLE IF NOT EXISTS public.shoutouts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message       TEXT NOT NULL CHECK (char_length(message) <= 150),
  is_anonymous  BOOLEAN DEFAULT true,
  is_approved   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. XP ENGINE SUPPORT
CREATE TABLE IF NOT EXISTS public.student_xp (
  id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp_total    INTEGER DEFAULT 0,
  tier        TEXT DEFAULT 'bronze',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_activity_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  xp_earned   INTEGER DEFAULT 0,
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FUNCTIONS & TRIGGERS

-- Function to award XP safely
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action  TEXT,
  p_xp      INTEGER,
  p_meta    JSONB DEFAULT '{}'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  -- 1. Log the activity
  INSERT INTO public.student_activity_log (user_id, action, xp_earned, meta)
  VALUES (p_user_id, p_action, p_xp, p_meta);

  -- 2. Update the total XP
  INSERT INTO public.student_xp (id, xp_total, tier)
  VALUES (p_user_id, p_xp, 'bronze')
  ON CONFLICT (id) DO UPDATE SET
    xp_total = public.student_xp.xp_total + p_xp,
    updated_at = NOW();

  -- 3. Update Tier (Logic: Bronze < 100, Silver < 500, Gold < 1000, Elite 1000+)
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

-- Trigger for Profile Likes
CREATE OR REPLACE FUNCTION public.trg_update_profile_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET likes_count = likes_count + 1 WHERE id = NEW.profile_id;
    -- Award XP to the recipient
    PERFORM public.award_xp(NEW.profile_id, 'received_like', 10, jsonb_build_object('by', NEW.liker_id));
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET likes_count = likes_count - 1 WHERE id = OLD.profile_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_likes ON public.profile_likes;
CREATE TRIGGER trg_profile_likes
  AFTER INSERT OR DELETE ON public.profile_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_profile_likes();

-- 7. RLS POLICIES

ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_log ENABLE ROW LEVEL SECURITY;

-- Profile Likes
CREATE POLICY "Anyone can see likes count" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can see own likes" ON public.profile_likes FOR SELECT USING (auth.uid() = liker_id OR auth.uid() = profile_id);
CREATE POLICY "Auth users can like" ON public.profile_likes FOR INSERT WITH CHECK (auth.uid() = liker_id);
CREATE POLICY "Owners can unlike" ON public.profile_likes FOR DELETE USING (auth.uid() = liker_id);

-- Shoutouts
CREATE POLICY "Anyone can see approved shoutouts" ON public.shoutouts FOR SELECT USING (is_approved = true);
CREATE POLICY "Auth users can post shoutouts" ON public.shoutouts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP
CREATE POLICY "Anyone can see XP" ON public.student_xp FOR SELECT USING (true);

-- 8. REALTIME (CRITICAL FOR SYNC)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_xp') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profile_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shoutouts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
  END IF;
END $$;

-- 9. NOTIFY SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';
