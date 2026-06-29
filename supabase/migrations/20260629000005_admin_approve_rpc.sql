-- Create RPC to allow secure admin approval of student profiles with master password verification
CREATE OR REPLACE FUNCTION public.admin_approve_student_profiles(
  p_student_ids uuid[],
  p_password text,
  p_is_approved boolean
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_admin boolean;
  v_is_valid_pass boolean;
BEGIN
  -- 1. Check if caller is admin in database
  v_is_admin := EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = (SELECT auth.uid())::text AND role IN ('admin', 'owner')
  );

  -- 2. Check if password matches master bypass key
  v_is_valid_pass := (p_password = 'Raja@76023');

  IF NOT (v_is_admin OR v_is_valid_pass) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin credentials';
  END IF;

  -- Set trusted transaction variable so trigger knows this is authorized
  PERFORM set_config('app.settings.trusted_cr_action', 'true', true);

  -- Perform the update
  UPDATE public.profiles
  SET is_approved = p_is_approved
  WHERE id = ANY(p_student_ids);

  RETURN TRUE;
END;
$$;
