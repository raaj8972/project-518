-- ==========================
-- SEED SAMPLE COMMUNITY DATA
-- ==========================

-- 1. Create some sample Shout-outs (approved)
INSERT INTO public.shoutouts (user_id, message, is_anonymous, is_approved)
VALUES 
  ((SELECT id FROM auth.users LIMIT 1), 'Good luck to everyone in the Tech Symposium! 🚀', false, true),
  ((SELECT id FROM auth.users LIMIT 1), 'The design competition is getting intense! Who''s winning?', true, true),
  ((SELECT id FROM auth.users LIMIT 1), 'Shoutout to the organizers for this amazing dashboard! ❤️', false, true)
ON CONFLICT DO NOTHING;

-- 2. Ensure some profiles are marked as approved for the Carousel
UPDATE public.profiles 
SET is_approved = true, avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
WHERE id IN (SELECT id FROM profiles LIMIT 5);

-- 3. Seed some dummy activity for the "Activity War" (Pulse)
-- This targets the current hour to show up in the chart
INSERT INTO public.student_activity_log (user_id, action, meta)
SELECT 
  p.id, 
  'login', 
  jsonb_build_object('batch', p.batch)
FROM public.profiles p
LIMIT 10;

-- 4. Force a schema reload for the PostgREST views
NOTIFY pgrst, 'reload schema';
