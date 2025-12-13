-- Security Hardening for Coordinator System
-- 1. Add token expiry column
ALTER TABLE events ADD COLUMN IF NOT EXISTS coordinator_token_expires_at TIMESTAMPTZ;

-- 2. Update login function with token expiry (8 hours)
CREATE OR REPLACE FUNCTION login_coordinator(event_id_param BIGINT, password_param TEXT)
RETURNS JSON AS $$
DECLARE
  stored_pass TEXT;
  new_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Verify password
  SELECT TRIM(e.coordinator_password::TEXT) INTO stored_pass 
  FROM events e WHERE e.id = event_id_param;
  
  IF stored_pass IS NULL OR stored_pass != password_param THEN 
    RAISE EXCEPTION 'Invalid access code'; 
  END IF;

  -- Generate secure token and set expiry (8 hours)
  new_token := gen_random_uuid()::TEXT || '-' || extract(epoch from now())::TEXT;
  expires_at := now() + interval '8 hours';
  
  -- Update token and expiry (invalidates previous sessions)
  UPDATE events 
  SET coordinator_session_token = new_token,
      coordinator_token_expires_at = expires_at
  WHERE id = event_id_param;
  
  -- Return token and expiry as JSON
  RETURN json_build_object(
    'token', new_token,
    'expires_at', expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update fetch function with expiry check
DROP FUNCTION IF EXISTS get_coordinator_registrations(INT, TEXT);
DROP FUNCTION IF EXISTS get_coordinator_registrations(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION get_coordinator_registrations(event_id_param BIGINT, token_param TEXT)
RETURNS TABLE (reg_id TEXT, full_name TEXT, phone TEXT, event_id BIGINT, status TEXT) AS $$
DECLARE
  active_token TEXT;
  token_expires TIMESTAMPTZ;
BEGIN
  -- Get token and expiry
  SELECT e.coordinator_session_token, e.coordinator_token_expires_at 
  INTO active_token, token_expires 
  FROM events e WHERE e.id = event_id_param;
  
  -- Check token validity AND expiry
  IF active_token IS NULL OR active_token != token_param THEN 
    RETURN; 
  END IF;
  
  IF token_expires IS NOT NULL AND token_expires < now() THEN
    RETURN; -- Token expired
  END IF;

  -- Return data
  RETURN QUERY 
  SELECT r.id::TEXT, r.full_name::TEXT, r.phone::TEXT, r.event_id::BIGINT, r.status::TEXT 
  FROM registrations r 
  WHERE r.event_id = event_id_param 
  ORDER BY r.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update WhatsApp link function with expiry check
DROP FUNCTION IF EXISTS update_event_whatsapp_link(integer, text);
DROP FUNCTION IF EXISTS update_event_whatsapp_link(bigint, text);
DROP FUNCTION IF EXISTS update_event_whatsapp_link(bigint, text, text);

CREATE OR REPLACE FUNCTION update_event_whatsapp_link(
  event_id_param BIGINT,
  token_param TEXT,
  new_link TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_token TEXT;
  token_expires TIMESTAMPTZ;
BEGIN
  SELECT e.coordinator_session_token, e.coordinator_token_expires_at 
  INTO active_token, token_expires 
  FROM events e WHERE e.id = event_id_param;
  
  IF active_token IS NULL OR active_token != token_param THEN
    RAISE EXCEPTION 'Invalid session - please login again';
  END IF;
  
  IF token_expires IS NOT NULL AND token_expires < now() THEN
    RAISE EXCEPTION 'Session expired - please login again';
  END IF;

  UPDATE events SET whatsapp_group_link = new_link WHERE id = event_id_param;
END;
$$;

-- 5. Function to invalidate all coordinator sessions (for admin use)
CREATE OR REPLACE FUNCTION invalidate_coordinator_session(event_id_param BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events 
  SET coordinator_session_token = NULL, 
      coordinator_token_expires_at = NULL 
  WHERE id = event_id_param;
END;
$$;
