-- HARDEN REALTIME UPDATES
-- Ensures all column changes are sent to the client for immediate UI feedback.

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.student_xp REPLICA IDENTITY FULL;
ALTER TABLE public.profile_likes REPLICA IDENTITY FULL;

-- Refresh the publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.student_xp;
ALTER PUBLICATION supabase_realtime DROP TABLE public.profile_likes;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;

NOTIFY pgrst, 'reload schema';
