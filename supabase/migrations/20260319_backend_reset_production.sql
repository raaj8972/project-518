-- ==========================================
-- BACKEND RESET SCRIPT (FOR LIVE START)
-- ==========================================
-- This script clears all "test" and "sample" community data.
-- Run this in the Supabase SQL Editor when you are ready to go LIVE.

-- 1. Clear Shout-outs
TRUNCATE public.shoutouts CASCADE;

-- 2. Clear Social Likes
TRUNCATE public.profile_likes CASCADE;
UPDATE public.profiles SET likes_count = 0;

-- 3. Clear Activity Logs & XP
TRUNCATE public.student_activity_log CASCADE;
TRUNCATE public.student_xp CASCADE;

-- 4. Un-approve test students (Optional)
-- This keeps your admin profiles but resets the student pool.
-- UPDATE public.profiles SET is_approved = false WHERE id NOT IN (SELECT user_id FROM admin_users);

-- 5. Clear Team Connections
TRUNCATE public.teams CASCADE;
UPDATE public.registrations SET team_id = NULL;

COMMIT;
NOTIFY pgrst, 'reload schema';
