-- Function to clean up inactive admin presence records
-- Deletes records older than 1 hour
-- SECURITY DEFINER allows it to bypass RLS and delete records of other users

CREATE OR REPLACE FUNCTION cleanup_inactive_admin_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM admin_presence
  WHERE last_activity_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION cleanup_inactive_admin_presence() TO authenticated;

-- Optional: If pg_cron is available, schedule it
-- We wrap this in a DO block to avoid errors if pg_cron is not installed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup_admin_presence', '0 * * * *', 'SELECT cleanup_inactive_admin_presence()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if pg_cron is not available or permission denied
  NULL;
END $$;
