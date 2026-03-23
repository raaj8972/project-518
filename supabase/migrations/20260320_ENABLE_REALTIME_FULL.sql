-- ==========================================
-- ENABLE FULL REALTIME FOR SOCIAL FEED
-- ==========================================
-- This ensures that Supabase sends the WHOLE row on any change, 
-- allowing the frontend to see updated counts (likes_count) immediately
-- without waiting for a separate refetch to complete.

-- 1. Enable REPLICA IDENTITY FULL for core social tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.profile_likes REPLICA IDENTITY FULL;
ALTER TABLE public.student_xp REPLICA IDENTITY FULL;
ALTER TABLE public.shoutouts REPLICA IDENTITY FULL;

-- 2. Ensure Publication includes all necessary tables
-- (Safe DO block to handle cases where they might already be added)
DO $$
BEGIN
  -- Re-add tables to publication to ensure they are active
  -- Note: If you get "already exists" errors, it's fine.
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Notify postgrest to reload
NOTIFY pgrst, 'reload schema';
