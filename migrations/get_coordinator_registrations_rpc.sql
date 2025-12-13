-- First drop the function recursively to clean up any bad versions
DROP FUNCTION IF EXISTS get_coordinator_registrations(INT, TEXT);
DROP FUNCTION IF EXISTS get_coordinator_registrations(BIGINT, TEXT);

-- Recreate it with CORRECT types (id is text/varchar, not uuid)
-- This function is SECURITY DEFINER to bypass RLS policies on the registrations table
CREATE OR REPLACE FUNCTION get_coordinator_registrations(event_id_param BIGINT, password_param TEXT)
RETURNS TABLE (
  id TEXT,
  full_name TEXT,
  phone TEXT,
  event_id BIGINT,
  status TEXT
) AS $$
DECLARE
  stored_pass TEXT;
BEGIN
  -- 1. Check password (using alias 'e' for safety)
  SELECT TRIM(e.coordinator_password) INTO stored_pass
  FROM events e
  WHERE e.id = event_id_param;

  -- 2. Return nothing if password fails
  IF stored_pass IS NULL OR stored_pass != password_param THEN
    RETURN;
  END IF;

  -- 3. Return data with safe casting (id is text)
  RETURN QUERY
  SELECT 
    r.id::TEXT,
    r.full_name,
    r.phone,
    r.event_id::BIGINT,
    r.status::TEXT
  FROM registrations r
  WHERE r.event_id = event_id_param 
  AND r.status = 'approved'
  ORDER BY r.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
