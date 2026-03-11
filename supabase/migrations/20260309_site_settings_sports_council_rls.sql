-- Fix site settings RLS to allow sports council members to update the annual sports mode toggle

CREATE OR REPLACE FUNCTION public.can_edit_site_settings()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- True if user is in admin_users (master admin / owner)
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) 
  OR 
  -- True if user has the can_sports permission explicitly
  EXISTS (
    SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid() AND can_sports = true
  );
$$;

-- Drop original strict policy
DROP POLICY IF EXISTS site_settings_update ON public.site_settings;

-- Create new robust policy
CREATE POLICY site_settings_update ON public.site_settings
FOR UPDATE USING (public.can_edit_site_settings()) WITH CHECK (public.can_edit_site_settings());

-- Reload cache
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN NULL; END $$;
