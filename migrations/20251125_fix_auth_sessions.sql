-- 1. Clear application-level session tracking
TRUNCATE TABLE public.admin_sessions;

-- 2. Remove Supabase Auth sessions for all admin users
DO $$
DECLARE
  del_sql TEXT;
BEGIN
  -- Check for 'data' column (newer Supabase versions)
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'data'
  ) THEN
    del_sql := $q$
      DELETE FROM auth.sessions
      WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
    $q$;
  -- Fallback for older versions or standard 'access_token' column
  ELSE
    del_sql := $q$
      DELETE FROM auth.sessions
      WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
    $q$;
  END IF;
  
  EXECUTE del_sql;
END$$;

-- 3. Revoke all refresh tokens for admin users
DELETE FROM auth.refresh_tokens
WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
