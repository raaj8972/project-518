-- Essential Patch for Shoutout Visibility
DROP POLICY IF EXISTS "Approved shoutouts read" ON public.shoutouts;
CREATE POLICY "Approved shoutouts read" ON public.shoutouts FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
NOTIFY pgrst, 'reload schema';
