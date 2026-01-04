-- 1. Add valid_date column to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS valid_date DATE DEFAULT NULL;

-- 2. Create function to update pass date (for Admin/editing)
DROP FUNCTION IF EXISTS public.update_pass_date(UUID, DATE);

CREATE OR REPLACE FUNCTION public.update_pass_date(
  p_pass_id UUID,
  p_new_date DATE
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Check authorization (Admin only for simplicity in this context, or add Council check if needed)
  -- For now, we assume the caller application handles the UI-level permission check, 
  -- but we enforce that the user must be authenticated.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.entry_passes
  SET valid_date = p_new_date
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass date updated');
END; $$;

-- 3. Update create_vip_pass_v3 to accept valid_date
DROP FUNCTION IF EXISTS public.create_vip_pass_v3(TEXT, TEXT, TEXT); -- Drop old signature
DROP FUNCTION IF EXISTS public.create_vip_pass_v3(TEXT, TEXT, TEXT, DATE); -- Drop new signature if partly created

CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_valid_date DATE DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;
     
     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid(), p_valid_date) 
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 4. Update get_council_vip_passes_v3 to return valid_date
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(TEXT);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password (v3)';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at, valid_date
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_pass_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(TEXT, TEXT, TEXT, DATE) TO anon, authenticated;
