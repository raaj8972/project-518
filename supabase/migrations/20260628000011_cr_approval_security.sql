-- Create CR approval function and trigger to secure profiles table

-- 1. Create approve_student_profile RPC
CREATE OR REPLACE FUNCTION public.approve_student_profile(
  p_student_id uuid,
  p_batch text,
  p_password text,
  p_is_approved boolean
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_valid_cr boolean;
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  v_is_admin := EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')
  );

  -- Check if caller is valid CR for this batch
  v_is_valid_cr := EXISTS (
    SELECT 1 FROM public.batch_crs
    WHERE batch = p_batch AND password = p_password
  );

  IF NOT (v_is_admin OR v_is_valid_cr) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid CR password or admin role';
  END IF;

  -- Set trusted transaction variable so trigger knows this is authorized
  PERFORM set_config('app.settings.trusted_cr_action', 'true', true);

  -- Perform the update
  UPDATE public.profiles
  SET is_approved = p_is_approved
  WHERE id = p_student_id;

  RETURN TRUE;
END;
$$;

-- 2. Create trigger to prevent unauthorized updates to is_approved
CREATE OR REPLACE FUNCTION public.prevent_profile_self_approval()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- If is_approved is being modified
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    -- Check if trusted flag is set in transaction settings
    IF current_setting('app.settings.trusted_cr_action', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- Check if caller is Admin
    IF EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')
    ) THEN
      RETURN NEW;
    END IF;

    -- Block the update
    RAISE EXCEPTION 'Unauthorized: You are not authorized to modify profile approval status';
  END IF;

  RETURN NEW;
END;
$$;

-- Bind trigger to profiles table
DROP TRIGGER IF EXISTS tr_prevent_profile_self_approval ON public.profiles;
CREATE TRIGGER tr_prevent_profile_self_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_self_approval();
