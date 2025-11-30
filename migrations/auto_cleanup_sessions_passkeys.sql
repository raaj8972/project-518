-- Enable automatic 24-hour cleanup for admin sessions and passkeys
-- This migration creates:
-- 1. Cleanup functions for old data
-- 2. pg_cron scheduled jobs to run cleanup daily
-- 3. Ensures UI deletions sync to backend

-- ============================================
-- PART 1: PASSKEY CLEANUP FUNCTION
-- ============================================

-- Function to clean up old passkeys (unused for 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_passkeys()
RETURNS void AS $$
BEGIN
  DELETE FROM public.passkeys
  WHERE last_used_at < now() - interval '24 hours';
  
  -- Also clean up expired challenges
  DELETE FROM public.passkey_challenges
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: SESSION CLEANUP FUNCTION (Update existing)
-- ============================================

-- Function to clean up old sessions (inactive for 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE last_seen_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: COMBINED CLEANUP FUNCTION
-- ============================================

-- Master cleanup function that runs both
CREATE OR REPLACE FUNCTION public.cleanup_auth_data()
RETURNS void AS $$
BEGIN
  PERFORM public.cleanup_old_sessions();
  PERFORM public.cleanup_old_passkeys();
  
  RAISE NOTICE 'Cleaned up sessions and passkeys older than 24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: ENABLE pg_cron EXTENSION (if available)
-- ============================================

-- Try to enable pg_cron extension for scheduled jobs
-- Note: This requires superuser privileges or Supabase dashboard
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions 
    WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Schedule cleanup job to run daily at 2 AM UTC
    -- First, remove existing job if it exists
    PERFORM cron.unschedule('cleanup_auth_data_job');
    
    -- Schedule new job
    PERFORM cron.schedule(
      'cleanup_auth_data_job',
      '0 2 * * *',  -- Run at 2 AM every day
      $$SELECT public.cleanup_auth_data();$$
    );
    
    RAISE NOTICE 'Scheduled daily cleanup job at 2 AM UTC';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Use manual cleanup or Supabase Edge Functions';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %. Set up manual cleanup or use Edge Functions', SQLERRM;
END $$;

-- ============================================
-- PART 5: MANUAL CLEANUP TRIGGER (Alternative)
-- ============================================

-- If pg_cron is not available, you can manually run cleanup on each operation
-- This trigger runs cleanup before any SELECT on sessions (light throttling recommended)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_auth_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run cleanup occasionally (e.g., 1% chance on each query)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_auth_data();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create trigger to auto-cleanup on admin_sessions access
-- (Commented out by default - uncomment if you want this behavior)
-- DROP TRIGGER IF EXISTS auto_cleanup_sessions ON public.admin_sessions;
-- CREATE TRIGGER auto_cleanup_sessions
--   BEFORE INSERT ON public.admin_sessions
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION public.trigger_cleanup_auth_data();

-- ============================================
-- PART 6: GRANT PERMISSIONS
-- ============================================

-- Allow authenticated users to run manual cleanup if needed
GRANT EXECUTE ON FUNCTION public.cleanup_auth_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_passkeys() TO authenticated;

-- ============================================
-- VERIFICATION & MANUAL EXECUTION
-- ============================================

-- You can manually test the cleanup by running:
-- SELECT public.cleanup_auth_data();

-- To check scheduled jobs (if pg_cron is enabled):
-- SELECT * FROM cron.job;

COMMENT ON FUNCTION public.cleanup_auth_data() IS 'Automatically cleans up admin sessions and passkeys older than 24 hours';
COMMENT ON FUNCTION public.cleanup_old_sessions() IS 'Deletes admin sessions inactive for more than 24 hours';
COMMENT ON FUNCTION public.cleanup_old_passkeys() IS 'Deletes passkeys not used for more than 24 hours';
