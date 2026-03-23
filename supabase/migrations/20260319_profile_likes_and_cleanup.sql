-- ==========================
-- 1. PROFILE LIKES SYSTEM
-- ==========================

-- Table to track individual likes (one like per profile per user)
CREATE TABLE IF NOT EXISTS public.profile_likes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(liker_id, profile_id)
);

-- Denormalized column for performance in Carousel
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Trigger to increment/decrement likes_count
CREATE OR REPLACE FUNCTION public.trg_update_profile_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cur_likes INTEGER;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET likes_count = likes_count + 1 WHERE id = NEW.profile_id;
    
    -- Award +10 XP to the recipient of the heart
    PERFORM public.award_xp(NEW.profile_id, 'received_profile_like', 10, jsonb_build_object('from_liker', NEW.liker_id));
    
    -- MILESTONE BONUSES
    SELECT likes_count INTO cur_likes FROM public.profiles WHERE id = NEW.profile_id;
    IF cur_likes = 5 THEN
      PERFORM public.award_xp(NEW.profile_id, 'social_trending_bonus', 20, jsonb_build_object('milestone', 5));
    ELSIF cur_likes = 10 THEN
      PERFORM public.award_xp(NEW.profile_id, 'social_star_bonus', 50, jsonb_build_object('milestone', 10));
    END IF;
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

-- RLS for profile_likes
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can see counts (on profiles table), but individual records are private
CREATE POLICY "owner_or_liker_can_view_likes" ON public.profile_likes
  FOR SELECT TO authenticated USING (auth.uid() = liker_id OR auth.uid() = profile_id);

CREATE POLICY "users_can_like" ON public.profile_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "users_can_unlike" ON public.profile_likes
  FOR DELETE TO authenticated USING (auth.uid() = liker_id);

-- ==========================
-- 2. BACKEND CLEANUP (FOR LIVE START)
-- ==========================

-- WARNING: These lines are commented out to prevent accidental wipe.
-- Use these in the SQL Editor to clear test data.
/*
TRUNCATE public.shoutouts CASCADE;
TRUNCATE public.student_activity_log CASCADE;
TRUNCATE public.student_xp CASCADE;
TRUNCATE public.profile_likes CASCADE;
UPDATE public.profiles SET likes_count = 0, is_approved = false WHERE id NOT IN (SELECT user_id FROM admin_users);
*/

NOTIFY pgrst, 'reload schema';

-- Enable Realtime for Social Interaction & XP
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;

-- ==========================
-- 3. 24-HOUR ROLLING WINDOW (CLEANUP)
-- ==========================

-- Function to cleanup old likes and update counts automatically
-- This keeps the "Trending" feed fresh by only counting hearts from the last 24 hours.
CREATE OR REPLACE FUNCTION public.cleanup_expired_likes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Deleting from profile_likes triggers the trg_profile_likes which decrements profiles.likes_count
  DELETE FROM public.profile_likes
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Schedule the cleanup to run every 10 minutes for a highly dynamic leaderboard
-- Note: 'pg_cron' must be enabled in your Supabase project settings.
-- If not enabled, you can run: CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup-likes-job', '*/10 * * * *', 'SELECT public.cleanup_expired_likes();');
