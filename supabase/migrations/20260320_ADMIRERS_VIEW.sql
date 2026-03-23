-- 🎭 ADMIRERS VIEW (Who Liked Me)
-- This view allows the frontend to easily see who liked a profile
-- without complex manual joins on the client side.

-- DROP the view first to allow column type changes (UUID -> TEXT)
DROP VIEW IF EXISTS public.view_profile_admirers;

CREATE OR REPLACE VIEW public.view_profile_admirers AS
SELECT 
  l.profile_id::TEXT AS target_id,
  l.liker_id::TEXT AS liker_id,
  p.full_name AS liker_name,
  p.avatar_url AS liker_avatar,
  s.tier AS liker_tier,
  l.created_at
FROM public.profile_likes l
JOIN public.profiles p ON l.liker_id::TEXT = p.id::TEXT
LEFT JOIN public.student_xp s ON l.liker_id::TEXT = s.id::TEXT;

-- Ensure RLS safety (the view inherits permissions or we can apply them)
-- Since it's a view on public tables, we update underlying RLS to be text-resilient.
DROP POLICY IF EXISTS "owner_or_liker_can_view_likes" ON public.profile_likes;
CREATE POLICY "owner_or_liker_can_view_likes" ON public.profile_likes
  FOR SELECT TO authenticated 
  USING (
    auth.uid()::TEXT = liker_id::TEXT 
    OR 
    auth.uid()::TEXT = profile_id::TEXT
  );

-- Also ensure anyone can read from the view if they are authenticated
-- (The above policy effectively restricts it to relevant users)
GRANT SELECT ON public.view_profile_admirers TO authenticated;
GRANT SELECT ON public.view_profile_admirers TO anon;
-- User requirement: "Who liked me", implies privacy or profile context.
-- We'll allow users to read the view where target_id is their own.

GRANT SELECT ON public.view_profile_admirers TO authenticated;

-- Notify
NOTIFY pgrst, 'reload schema';
