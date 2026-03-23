-- 🚀 MASTER REPAIR FOR community SYSTEM
-- This script is a "one-click" fix for likes, XP, and real-time synchronization.
-- It ensures all dependencies are correctly linked and permissions are granted.

-- 1. CLEAN REBUILD OF LIKES TABLE
DROP TABLE IF EXISTS public.profile_likes CASCADE;
CREATE TABLE public.profile_likes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(liker_id, profile_id)
);

-- 2. RESTORE XP ENGINE (V4)
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action  TEXT,
  p_xp      INTEGER,
  p_meta    JSONB DEFAULT '{}'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  -- Log activity
  INSERT INTO public.student_activity_log (user_id, action, xp_earned, meta)
  VALUES (p_user_id, p_action, p_xp, p_meta);

  -- Upsert XP
  INSERT INTO public.student_xp (id, xp_total, tier)
  VALUES (p_user_id, p_xp, 'bronze')
  ON CONFLICT (id) DO UPDATE SET
    xp_total = public.student_xp.xp_total + p_xp,
    updated_at = NOW();

  -- Recalculate Tier
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

-- 3. RESTORE LIKE TRIGGER
CREATE OR REPLACE FUNCTION public.trg_update_profile_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET likes_count = likes_count + 1 WHERE id = NEW.profile_id;
    -- Award XP to the recipient
    PERFORM public.award_xp(NEW.profile_id, 'received_like', 10, jsonb_build_object('by', NEW.liker_id));
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.profile_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_likes ON public.profile_likes;
CREATE TRIGGER trg_profile_likes
  AFTER INSERT OR DELETE ON public.profile_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_profile_likes();

-- 4. RLS POLICIES (GIVE ACCESS)
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public likes read" ON public.profile_likes;
CREATE POLICY "Public likes read" ON public.profile_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth like" ON public.profile_likes;
CREATE POLICY "Auth like" ON public.profile_likes FOR INSERT WITH CHECK (auth.uid() = liker_id);

DROP POLICY IF EXISTS "Auth unlike" ON public.profile_likes;
CREATE POLICY "Auth unlike" ON public.profile_likes FOR DELETE USING (auth.uid() = liker_id);

-- 5. REALTIME (HYPER-SYNC)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.student_xp REPLICA IDENTITY FULL;
ALTER TABLE public.profile_likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profile_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 6. RELOAD
NOTIFY pgrst, 'reload schema';
