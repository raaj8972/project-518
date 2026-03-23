-- REPAIR PROFILE LIKES SYSTEM
-- This script fixes the "Social connection error" by adding RLS policies 
-- and restores the triggers for like counts and XP rewards.

-- 1. RLS POLICIES FOR PROFILE_LIKES
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profile likes" ON public.profile_likes;
CREATE POLICY "Anyone can view profile likes" ON public.profile_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can like" ON public.profile_likes;
CREATE POLICY "Auth users can like" ON public.profile_likes
  FOR INSERT WITH CHECK (auth.uid() = liker_id);

DROP POLICY IF EXISTS "Owners can unlike" ON public.profile_likes;
CREATE POLICY "Owners can unlike" ON public.profile_likes
  FOR DELETE USING (auth.uid() = liker_id);

-- 2. TRIGGER TO SYNC LIKES COUNT AND XP
-- We use SECURITY DEFINER so it can update profiles/xp regardless of user RLS.
CREATE OR REPLACE FUNCTION public.trg_update_profile_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment the like count on the target profile
    UPDATE public.profiles 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.profile_id;
    
    -- Award XP to the recipient (10 XP per like received)
    PERFORM public.award_xp(NEW.profile_id, 'received_like', 10, jsonb_build_object('by', NEW.liker_id));
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement the like count
    UPDATE public.profiles 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.profile_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. BIND TRIGGER
DROP TRIGGER IF EXISTS trg_profile_likes ON public.profile_likes;
CREATE TRIGGER trg_profile_likes
  AFTER INSERT OR DELETE ON public.profile_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_profile_likes();

-- 4. ENSURE REALTIME IS ENABLED FOR THIS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profile_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
