-- Security QR System - Single Paste Installation
-- Just copy this entire file and paste into Supabase SQL Editor

-- 1. Create enum
DO $$ BEGIN
  CREATE TYPE public.pass_type AS ENUM ('event_registration', 'general_entry', 'vip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.security_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pass_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_token TEXT NOT NULL UNIQUE,
  pass_type public.pass_type NOT NULL,
  event_registration_id TEXT REFERENCES public.registrations(id) ON DELETE CASCADE,
  pass_registration_id UUID REFERENCES public.pass_registrations(id) ON DELETE CASCADE,
  participant_name TEXT,
  notes TEXT,
  is_used BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.pass_scans (
  id BIGSERIAL PRIMARY KEY,
  pass_id UUID REFERENCES public.entry_passes(id) ON DELETE CASCADE,
  scanned_by_username TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scan_result TEXT NOT NULL CHECK (scan_result IN ('valid', 'already_used', 'invalid', 'inactive', 'invalid_date')),
  participant_name TEXT,
  pass_type public.pass_type
);

-- 3. Enable RLS
ALTER TABLE public.security_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_scans ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (drop first to avoid conflicts)
DO $$ BEGIN
  DROP POLICY IF EXISTS security_users_admin_all ON public.security_users;
  DROP POLICY IF EXISTS pass_registrations_public_insert ON public.pass_registrations;
  DROP POLICY IF EXISTS pass_registrations_select_own ON public.pass_registrations;
  DROP POLICY IF EXISTS pass_registrations_admin_all ON public.pass_registrations;
  DROP POLICY IF EXISTS entry_passes_admin_all ON public.entry_passes;
  DROP POLICY IF EXISTS pass_scans_security_select ON public.pass_scans;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY security_users_admin_all ON public.security_users FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'owner'));

CREATE POLICY pass_registrations_public_insert ON public.pass_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY pass_registrations_select_own ON public.pass_registrations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY pass_registrations_admin_all ON public.pass_registrations FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY entry_passes_admin_all ON public.entry_passes FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY pass_scans_security_select ON public.pass_scans FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()));

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_entry_passes_token ON public.entry_passes(pass_token);
CREATE INDEX IF NOT EXISTS idx_entry_passes_event_reg ON public.entry_passes(event_registration_id);
CREATE INDEX IF NOT EXISTS idx_entry_passes_pass_reg ON public.entry_passes(pass_registration_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_pass_id ON public.pass_scans(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_pass_registrations_email ON public.pass_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pass_registrations_status ON public.pass_registrations(status);

-- 6. Create functions (using CREATE OR REPLACE to avoid conflicts)
CREATE OR REPLACE FUNCTION public.create_security_user(p_username TEXT, p_password TEXT, p_full_name TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_is_owner BOOLEAN; v_password_hash TEXT; v_new_id BIGINT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner') INTO v_is_owner;
  IF NOT v_is_owner THEN RAISE EXCEPTION 'Only owners can create security users'; END IF;
  v_password_hash := crypt(p_password, gen_salt('bf'));
  INSERT INTO public.security_users (username, password_hash, full_name, created_by)
  VALUES (p_username, v_password_hash, p_full_name, auth.uid()) RETURNING id INTO v_new_id;
  RETURN json_build_object('success', true, 'id', v_new_id, 'username', p_username);
END; $func$;

CREATE OR REPLACE FUNCTION public.authenticate_security_user(p_username TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM public.security_users WHERE username = p_username AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Invalid username or password'); END IF;
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object('success', true, 'user', json_build_object('id', v_user.id, 'username', v_user.username, 'full_name', v_user.full_name));
  ELSE
    RETURN json_build_object('success', false, 'message', 'Invalid username or password');
  END IF;
END; $func$;

CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_event_dates JSONB;
  v_today_str TEXT;
  v_day_number INTEGER := 0;
  v_day_label TEXT := '';
  v_date_item TEXT;
  v_idx INTEGER;
BEGIN
  v_username := COALESCE(current_setting('request.jwt.claims', true)::json->>'email', current_user);
  -- Force IST (Asia/Kolkata) for date comparison
  v_today_str := to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');

  -- Get Event Dates Config
  SELECT event_dates INTO v_event_dates FROM public.security_settings LIMIT 1;
  
  -- Determine "Day X" and Strict Check
  IF v_event_dates IS NOT NULL AND jsonb_array_length(v_event_dates) > 0 THEN
    v_idx := 1;
    FOR v_date_item IN SELECT * FROM jsonb_array_elements_text(v_event_dates)
    LOOP
      IF v_date_item = v_today_str THEN
        v_day_number := v_idx;
        v_day_label := ' (Day ' || v_idx || ')';
      END IF;
      v_idx := v_idx + 1;
    END LOOP;

    -- STRICT CHECK: If dates are configured but today is NOT one of them
    IF v_day_number = 0 THEN
       v_scan_result := 'invalid_date';
       -- Log attempt
       INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) 
       VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
       RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Entry denied: ' || v_today_str || ' is not an event day');
    END IF;
  END IF;

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- Logic: Check if scanned TODAY (IST)
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object(
      'valid', false, 
      'result', v_scan_result, 
      'message', 'Pass already used for Day ' || v_day_number, 
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;

  -- 5. Success
  v_scan_result := 'valid';
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id; 
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true, 
    'result', v_scan_result, 
    'message', 'Valid Entry' || v_day_label, 
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 
    'pass_type', v_pass.pass_type
  );
END; $func$;

CREATE OR REPLACE FUNCTION public.create_vip_pass(p_name TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_is_admin BOOLEAN; v_pass_id UUID; v_pass_token TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can create VIP passes'; END IF;
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $func$;

CREATE OR REPLACE FUNCTION public.approve_pass_registration(p_pass_reg_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_is_admin BOOLEAN; v_registration RECORD; v_pass_id UUID; v_pass_token TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can approve pass registrations'; END IF;
  SELECT * INTO v_registration FROM public.pass_registrations WHERE id = p_pass_reg_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pass registration not found'; END IF;
  IF v_registration.status != 'pending' THEN RAISE EXCEPTION 'Pass registration has already been processed'; END IF;
  UPDATE public.pass_registrations SET status = 'approved', approved_by = auth.uid(), approved_at = NOW() WHERE id = p_pass_reg_id;
  v_pass_token := 'PASS-' || upper(substring(md5(random()::text || p_pass_reg_id::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, pass_registration_id, participant_name, created_by)
  VALUES (v_pass_token, 'general_entry', p_pass_reg_id, v_registration.full_name, auth.uid()) RETURNING id INTO v_pass_id;
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $func$;

CREATE OR REPLACE FUNCTION public.reset_pass_usage(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can reset passes'; END IF;
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  UPDATE public.entry_passes SET is_used = false WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass usage reset successfully');
END; $func$;

CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete scans'; END IF;
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id AND scanned_at::date = p_date;
  RETURN json_build_object('success', true, 'message', 'Scan deleted successfully');
END; $func$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_security_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_security_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_entry_pass TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_vip_pass TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pass_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_pass_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pass_scan_for_date TO authenticated;

-- Council Dashboard Support
ALTER TABLE public.security_settings ADD COLUMN IF NOT EXISTS council_password_hash TEXT;

CREATE OR REPLACE FUNCTION public.set_council_password(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can set council password'; END IF;
  UPDATE public.security_settings SET council_password_hash = crypt(p_password, gen_salt('bf')) WHERE id = 1;
  RETURN json_build_object('success', true);
END; $func$;

CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
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
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats (Robust Join + Fallbacks)
  SELECT json_agg(t) INTO v_event_stats FROM (
    SELECT 
      COALESCE(e.title, r.event_title, 'General/Other') as event_name, 
      COUNT(r.id) as count
    FROM public.registrations r
    LEFT JOIN public.events e ON r.event_id = e.id
    WHERE r.status IN ('pending', 'approved')
    AND r.deleted_at IS NULL
    GROUP BY COALESCE(e.title, r.event_title, 'General/Other')
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;

GRANT EXECUTE ON FUNCTION public.set_council_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_dashboard_stats(TEXT) TO anon, authenticated;

-- Function to get public list of security users (for login dropdown)
CREATE OR REPLACE FUNCTION public.get_public_security_users()
RETURNS TABLE (
  username TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.username,
    su.full_name
  FROM public.security_users su
  WHERE su.is_active = true
  ORDER BY su.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO anon, authenticated;
