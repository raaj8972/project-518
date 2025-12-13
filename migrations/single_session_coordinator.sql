-- 1. Add session token column if not exists
ALTER TABLE events ADD COLUMN IF NOT EXISTS coordinator_session_token TEXT;

-- 2. Login Function: Generates new token, invalidating old sessions
CREATE OR REPLACE FUNCTION login_coordinator(event_id_param BIGINT, password_param TEXT)
RETURNS TEXT AS $$
DECLARE
  stored_pass TEXT;
  new_token TEXT;
BEGIN
  -- Verify password (trimming whitespace)
  SELECT TRIM(coordinator_password) INTO stored_pass
  FROM events
  WHERE id = event_id_param;

  IF stored_pass IS NULL OR stored_pass != password_param THEN
    RAISE EXCEPTION 'Invalid access code';
  END IF;

  -- Generate new unique token
  new_token := gen_random_uuid()::TEXT;

  -- Update the event with this new token
  UPDATE events 
  SET coordinator_session_token = new_token 
  WHERE id = event_id_param;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop OLD Fetch functions (using password)
DROP FUNCTION IF EXISTS get_coordinator_registrations(INT, TEXT);
DROP FUNCTION IF EXISTS get_coordinator_registrations(BIGINT, TEXT);

-- 4. Create NEW Fetch function (using SESSION TOKEN)
CREATE OR REPLACE FUNCTION get_coordinator_registrations(event_id_param BIGINT, token_param TEXT)
RETURNS TABLE (
  id TEXT,
  full_name TEXT,
  phone TEXT,
  event_id BIGINT,
  status TEXT
) AS $$
DECLARE
  active_token TEXT;
BEGIN
  -- Check if the token matches the current active token for this event
  SELECT coordinator_session_token INTO active_token
  FROM events
  WHERE id = event_id_param;

  -- If token doesn't match (or is null), access denied
  IF active_token IS NULL OR active_token != token_param THEN
    RETURN;
  END IF;

  -- 3. Return data (id cast to TEXT explicitly)
  RETURN QUERY
  SELECT 
    r.id::TEXT,
    r.full_name::TEXT,
    r.phone::TEXT,
    r.event_id::BIGINT,
    r.status::TEXT
  FROM registrations r
  WHERE r.event_id = event_id_param 
  -- Removed status filter to allow frontend to show stats
  ORDER BY 
    CASE WHEN r.status = 'approved' THEN 1 
         WHEN r.status = 'pending' THEN 2 
         ELSE 3 END,
    r.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
