-- Security QR Code Entry Management System
-- Creates tables and functions for security personnel, pass management, and entry scanning

-- =====================================================
-- 1. CREATE PASS TYPE ENUM
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.pass_type AS ENUM (
    'event_registration',
    'general_entry',
    'vip'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. SECURITY USERS TABLE
-- =====================================================
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

-- Enable RLS
ALTER TABLE public.security_users ENABLE ROW LEVEL SECURITY;

-- Security users can view only their own record
CREATE POLICY security_users_select_own ON public.security_users
  FOR SELECT
  USING (username = current_user);

-- Only owners can manage security users
CREATE POLICY security_users_admin_all ON public.security_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'owner'
    )
  );

-- =====================================================
-- 3. PASS REGISTRATIONS TABLE (Public requests)
-- =====================================================
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

-- Enable RLS
ALTER TABLE public.pass_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public registration)
CREATE POLICY pass_registrations_public_insert ON public.pass_registrations
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view their own by email
CREATE POLICY pass_registrations_select_own ON public.pass_registrations
  FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.uid() IS NOT NULL);

-- Admins can view/update all
CREATE POLICY pass_registrations_admin_all ON public.pass_registrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. ENTRY PASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_token TEXT NOT NULL UNIQUE,
  pass_type public.pass_type NOT NULL,
  
  -- Link to different sources
  event_registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  pass_registration_id UUID REFERENCES public.pass_registrations(id) ON DELETE CASCADE,
  
  -- Pass details (especially for VIP)
  participant_name TEXT,
  notes TEXT,
  
  -- Usage tracking
  is_used BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;

-- Security users can view passes (for scanning)
CREATE POLICY entry_passes_security_select ON public.entry_passes
  FOR SELECT
  USING (
    -- Security users can view
    EXISTS (
      SELECT 1 FROM public.security_users
      WHERE security_users.username = current_user
      AND security_users.is_active = true
    )
    OR
    -- Admins can view
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Anyone with the token can view their own pass (for download page)
CREATE POLICY entry_passes_public_select_own ON public.entry_passes
  FOR SELECT
  USING (
    -- Check if user owns the related pass_registration
    EXISTS (
      SELECT 1 FROM public.pass_registrations pr
      WHERE pr.id = entry_passes.pass_registration_id
      AND pr.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Admins can manage all passes
CREATE POLICY entry_passes_admin_all ON public.entry_passes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. PASS SCANS TABLE (Audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pass_scans (
  id BIGSERIAL PRIMARY KEY,
  pass_id UUID NOT NULL REFERENCES public.entry_passes(id) ON DELETE CASCADE,
  scanned_by_username TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scan_result TEXT NOT NULL CHECK (scan_result IN ('valid', 'already_used', 'invalid', 'inactive')),
  participant_name TEXT,
  pass_type public.pass_type
);

-- Enable RLS
ALTER TABLE public.pass_scans ENABLE ROW LEVEL SECURITY;

-- Security users can view scans
CREATE POLICY pass_scans_security_select ON public.pass_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.security_users
      WHERE security_users.username = current_user
      AND security_users.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Security users can insert scans
CREATE POLICY pass_scans_security_insert ON public.pass_scans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.security_users
      WHERE security_users.username = current_user
      AND security_users.is_active = true
    )
  );

-- =====================================================
-- 6. RPC FUNCTIONS
-- =====================================================

-- Function to create security user (owner only)
CREATE OR REPLACE FUNCTION public.create_security_user(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_password_hash TEXT;
  v_new_id BIGINT;
BEGIN
  -- Check if caller is owner
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only owners can create security users';
  END IF;
  
  -- Hash password (basic - in production use proper bcrypt)
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Insert security user
  INSERT INTO public.security_users (username, password_hash, full_name, created_by)
  VALUES (p_username, v_password_hash, p_full_name, auth.uid())
  RETURNING id INTO v_new_id;
  
  RETURN json_build_object(
    'success', true,
    'id', v_new_id,
    'username', p_username
  );
END;
$$;

-- Function to validate entry pass (security only)
CREATE OR REPLACE FUNCTION public.validate_entry_pass(
  p_pass_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_scan_result TEXT;
  v_username TEXT;
BEGIN
  -- Get current security user
  v_username := current_user;
  
  -- Check if valid security user
  IF NOT EXISTS (
    SELECT 1 FROM public.security_users
    WHERE username = v_username AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not a valid security user';
  END IF;
  
  -- Find the pass
  SELECT * INTO v_pass
  FROM public.entry_passes
  WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    
    -- Log the scan attempt
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (NULL, v_username, v_scan_result, NULL, NULL);
    
    RETURN json_build_object(
      'valid', false,
      'result', v_scan_result,
      'message', 'Invalid pass token'
    );
  END IF;
  
  -- Check if inactive
  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false,
      'result', v_scan_result,
      'message', 'Pass has been deactivated'
    );
  END IF;
  
  -- Check if already used
  IF v_pass.is_used THEN
    v_scan_result := 'already_used';
    
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false,
      'result', v_scan_result,
      'message', 'Pass has already been used',
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;
  
  -- Valid pass - mark as used
  v_scan_result := 'valid';
  
  UPDATE public.entry_passes
  SET is_used = true
  WHERE id = v_pass.id;
  
  -- Log the successful scan
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true,
    'result', v_scan_result,
    'message', 'Valid entry',
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'),
    'pass_type', v_pass.pass_type
  );
END;
$$;

-- Function to generate pass for event registration
CREATE OR REPLACE FUNCTION public.generate_pass_for_event_registration(
  p_registration_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_registration RECORD;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can generate passes';
  END IF;
  
  -- Get registration details
  SELECT * INTO v_registration
  FROM public.registrations
  WHERE id = p_registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  -- Check if pass already exists
  IF EXISTS (
    SELECT 1 FROM public.entry_passes
    WHERE event_registration_id = p_registration_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Pass already exists for this registration';
  END IF;
  
  -- Generate unique token
  v_pass_token := 'EVNT-' || upper(substring(md5(random()::text || p_registration_id::text) from 1 for 12));
  
  -- Create pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    event_registration_id,
    participant_name,
    created_by
  )
  VALUES (
    v_pass_token,
    'event_registration',
    p_registration_id,
    v_registration.full_name,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;

-- Function to create VIP pass
CREATE OR REPLACE FUNCTION public.create_vip_pass(
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can create VIP passes';
  END IF;
  
  -- Generate unique token
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  
  -- Create VIP pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    participant_name,
    notes,
    created_by
  )
  VALUES (
    v_pass_token,
    'vip',
    p_name,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;

-- Function to approve pass registration and generate pass
CREATE OR REPLACE FUNCTION public.approve_pass_registration(
  p_pass_reg_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_registration RECORD;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can approve pass registrations';
  END IF;
  
  -- Get registration
  SELECT * INTO v_registration
  FROM public.pass_registrations
  WHERE id = p_pass_reg_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass registration not found';
  END IF;
  
  IF v_registration.status != 'pending' THEN
    RAISE EXCEPTION 'Pass registration has already been processed';
  END IF;
  
  -- Update registration status
  UPDATE public.pass_registrations
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW()
  WHERE id = p_pass_reg_id;
  
  -- Generate unique token
  v_pass_token := 'PASS-' || upper(substring(md5(random()::text || p_pass_reg_id::text) from 1 for 12));
  
  -- Create pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    pass_registration_id,
    participant_name,
    created_by
  )
  VALUES (
    v_pass_token,
    'general_entry',
    p_pass_reg_id,
    v_registration.full_name,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;

-- Function to authenticate security user login
CREATE OR REPLACE FUNCTION public.authenticate_security_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Get security user
  SELECT * INTO v_user
  FROM public.security_users
  WHERE username = p_username
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password'
    );
  END IF;
  
  -- Verify password against hash
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'full_name', v_user.full_name
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password'
    );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_security_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_entry_pass TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_pass_for_event_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pass_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_security_user TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entry_passes_token ON public.entry_passes(pass_token);
CREATE INDEX IF NOT EXISTS idx_entry_passes_event_reg ON public.entry_passes(event_registration_id);
CREATE INDEX IF NOT EXISTS idx_entry_passes_pass_reg ON public.entry_passes(pass_registration_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_pass_id ON public.pass_scans(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_pass_registrations_email ON public.pass_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pass_registrations_status ON public.pass_registrations(status);
