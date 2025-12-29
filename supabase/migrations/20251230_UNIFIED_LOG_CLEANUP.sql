CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.login_history (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  identifier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can view login history" ON public.login_history;
  CREATE POLICY "Owners can view login history"
    ON public.login_history FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND role = 'owner'
      )
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_role TEXT,
  p_identifier TEXT,
  p_status TEXT DEFAULT 'success'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_history (role, identifier, ip_address, user_agent, status)
  VALUES (
    p_role,
    p_identifier,
    current_setting('request.header.x-forwarded-for', true),
    current_setting('request.header.user-agent', true),
    p_status
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Login logging failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_success BOOLEAN := false;
BEGIN
  SELECT * INTO v_user
  FROM public.security_users
  WHERE username = p_username
  AND is_active = true;
  
  IF FOUND AND v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    v_success := true;
    PERFORM public.log_login_attempt('security', p_username, 'success');
  ELSE
    PERFORM public.log_login_attempt('security', p_username, 'failure');
  END IF;

  IF v_success THEN
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

CREATE OR REPLACE FUNCTION public.login_coordinator(event_id_param BIGINT, password_param TEXT)
RETURNS JSON AS $$
DECLARE
  stored_pass TEXT;
  event_title TEXT;
  new_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT TRIM(e.coordinator_password::TEXT), e.title INTO stored_pass, event_title
  FROM events e WHERE e.id = event_id_param;
  
  IF stored_pass IS NULL OR stored_pass != password_param THEN 
    PERFORM public.log_login_attempt('coordinator', COALESCE(event_title, event_id_param::text), 'failure');
    RAISE EXCEPTION 'Invalid access code'; 
  END IF;

  new_token := gen_random_uuid()::TEXT || '-' || extract(epoch from now())::TEXT;
  expires_at := now() + interval '8 hours';
  
  UPDATE events 
  SET coordinator_session_token = new_token,
      coordinator_token_expires_at = expires_at
  WHERE id = event_id_param;

  PERFORM public.log_login_attempt('coordinator', event_title, 'success');
  
  RETURN json_build_object(
    'token', new_token,
    'expires_at', expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     PERFORM public.log_login_attempt('council', 'Council Dashboard', 'failure');
     RAISE EXCEPTION 'Invalid password';
  END IF;

  PERFORM public.log_login_attempt('council', 'Council Dashboard', 'success');

  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT 
        COALESCE(e.title, r.event_title, 'General/Other') as event_name,
        r.participant_type,
        COUNT(*) as batch_count
      FROM public.registrations r
      LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved')
      AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT 
      event_name,
      SUM(batch_count) as count,
      json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped
    GROUP BY event_name
    ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT id, participant_name, pass_type, scan_result, scanned_at
    FROM public.pass_scans
    WHERE scan_result = 'valid'
    ORDER BY scanned_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;

CREATE OR REPLACE FUNCTION public.purge_all_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE last_seen_at < now() - interval '48 hours';
  
  DELETE FROM public.login_history
  WHERE created_at < now() - interval '48 hours';
  
  RAISE NOTICE 'Successfully purged logs older than 48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge_all_logs_job');
    PERFORM cron.unschedule('cleanup_auth_data_job');
    
    PERFORM cron.schedule(
      'purge_all_logs_job',
      '30 21 * * *',
      'SELECT public.purge_all_logs();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron failed: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_auth_data()
RETURNS void AS $$
BEGIN
  PERFORM public.purge_all_logs();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
