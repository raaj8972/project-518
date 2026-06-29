-- Add UPDATE RLS policy for Admins and Owners (including system owners by email) on profiles table
DROP POLICY IF EXISTS "Admins and owners can update any profile" ON public.profiles;
CREATE POLICY "Admins and owners can update any profile" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')
    )
    OR coalesce(auth.jwt() ->> 'email', '') IN ('master-admin-bypass@virtual.local', 'ricorrenza.theiqcityfestival@gmail.com')
  );

-- Update trigger function to support system owners by email
CREATE OR REPLACE FUNCTION public.prevent_profile_self_approval()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
BEGIN
  -- If is_approved is being modified
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    -- Check if trusted flag is set in transaction settings
    IF current_setting('app.settings.trusted_cr_action', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- Check if caller is Admin/Owner or master-admin-bypass or system owner
    IF EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')
    ) OR coalesce(auth.jwt() ->> 'email', '') IN ('master-admin-bypass@virtual.local', 'ricorrenza.theiqcityfestival@gmail.com') THEN
      RETURN NEW;
    END IF;

    -- Block the update
    RAISE EXCEPTION 'Unauthorized: You are not authorized to modify profile approval status';
  END IF;

  RETURN NEW;
END;
$$;
