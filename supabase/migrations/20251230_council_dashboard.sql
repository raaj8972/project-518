-- Add council_password_hash to security_settings
ALTER TABLE public.security_settings
ADD COLUMN IF NOT EXISTS council_password_hash TEXT;

-- Function to set council password (hashes input)
CREATE OR REPLACE FUNCTION public.set_council_password(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can set council password'; 
  END IF;

  UPDATE public.security_settings
  SET council_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = 1;

  RETURN json_build_object('success', true);
END; $func$;

-- Function to get council dashboard stats (verified by password)
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT participant_type as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY participant_type
  ) t;

  -- 4. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;

GRANT EXECUTE ON FUNCTION public.set_council_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_dashboard_stats(TEXT) TO anon, authenticated;
