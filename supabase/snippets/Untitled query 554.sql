-- =============================================================
-- Security Fixes (2026-03-28)
-- Bugs fixed:
--   1. gallery_faces table has RLS disabled (exposed to PostgREST)
--   2. student_upcoming_events view uses SECURITY DEFINER
--   3. view_profile_admirers view uses SECURITY DEFINER
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Enable RLS on gallery_faces
--    This table stores face-embedding vectors linked to gallery
--    images. Access should be controlled via RLS policies.
-- ---------------------------------------------------------------
ALTER TABLE public.gallery_faces ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read face records (needed for face-search feature)
DROP POLICY IF EXISTS "gallery_faces_select_authenticated" ON public.gallery_faces;
CREATE POLICY "gallery_faces_select_authenticated" ON public.gallery_faces
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins/owners can insert / update / delete face records
DROP POLICY IF EXISTS "gallery_faces_insert_admin" ON public.gallery_faces;
CREATE POLICY "gallery_faces_insert_admin" ON public.gallery_faces
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "gallery_faces_update_admin" ON public.gallery_faces;
CREATE POLICY "gallery_faces_update_admin" ON public.gallery_faces
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "gallery_faces_delete_admin" ON public.gallery_faces;
CREATE POLICY "gallery_faces_delete_admin" ON public.gallery_faces
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------
-- 2. Fix SECURITY DEFINER on student_upcoming_events view
--    Switch to SECURITY INVOKER so the view respects the
--    querying user's own RLS policies, not the view creator's.
-- ---------------------------------------------------------------
ALTER VIEW public.student_upcoming_events SET (security_invoker = true);

-- ---------------------------------------------------------------
-- 3. Fix SECURITY DEFINER on view_profile_admirers view
--    Same reasoning as above.
-- ---------------------------------------------------------------
ALTER VIEW public.view_profile_admirers SET (security_invoker = true);

