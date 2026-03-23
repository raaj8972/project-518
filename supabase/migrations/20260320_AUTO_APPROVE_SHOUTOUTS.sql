-- ==========================================
-- AUTO-APPROVAL & ADMIN DELETION FOR SHOUTOUTS
-- ==========================================

-- 1. Update default value for auto-approval
ALTER TABLE public.shoutouts ALTER COLUMN is_approved SET DEFAULT true;

-- 2. Update existing shoutouts to be approved (optional but consistent)
UPDATE public.shoutouts SET is_approved = true WHERE is_approved = false;

-- 3. Update RLS for open visibility
DROP POLICY IF EXISTS "Shoutouts visibility" ON public.shoutouts;
DROP POLICY IF EXISTS "Approved shoutouts read" ON public.shoutouts;

CREATE POLICY "Shoutouts open read" ON public.shoutouts 
  FOR SELECT 
  USING (true);

-- 4. Ensure admin can delete
DROP POLICY IF EXISTS "Admin delete shoutout" ON public.shoutouts;
CREATE POLICY "Admin delete shoutout" ON public.shoutouts 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid()
    )
    OR
    (auth.jwt() ->> 'email' IN ('raaj@rico.fun', 'raja@rico.fun'))
  );

NOTIFY pgrst, 'reload schema';
