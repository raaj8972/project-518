-- Force logout of all admins by deleting their sessions from auth.sessions
-- and clearing the application-level session tracking table.
-- =============================================================
-- Force logout / diagnose malformed JWTs for admin users
-- Single script for pasting into Supabase SQL Editor.
-- Read the comments and run the preview queries first.
-- You must be a Supabase project admin (SQL Editor / service_role) to run auth schema deletes.
-- =============================================================

-- ==========================
-- 0) Preview: application-level sessions
-- ==========================
-- See how many rows will be cleared from the app tracking table
SELECT 'TRUNCATE public.admin_sessions' AS action, count(*) AS current_rows
FROM public.admin_sessions;

-- ==========================
-- 1) Diagnostics: find admin-related auth.sessions with missing or malformed access tokens
--    (Supabase stores token JSON in data->>'access_token' or in access_token column depending on version)
-- Run these preview queries and inspect results before deleting.
-- ==========================

-- a) Check rows where stored token is missing or does not have 3 '.'-separated segments
-- The sessions table schema can vary between Supabase versions (some use a JSON 'data' column,
-- others have a flat 'access_token' column). The PL/pgSQL blocks below detect which schema
-- is present and run the appropriate diagnostic and deletion SQL so we don't reference
-- a missing column.

-- Diagnostic: list up to 200 malformed admin sessions (dynamic to avoid missing column errors)
DO $$
DECLARE
	sql TEXT;
BEGIN
		IF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'data'
		) THEN
			sql := $q$
				SELECT id, user_id, data->>'access_token' AS access_token,
					array_length(string_to_array(data->>'access_token', '.'), 1) AS segments,
					created_at, last_activity
				FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
					AND (data->>'access_token' IS NULL OR array_length(string_to_array(data->>'access_token', '.'),1) IS DISTINCT FROM 3)
				ORDER BY created_at DESC
				LIMIT 200;
			$q$;
		ELSIF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'access_token'
		) THEN
			sql := $q$
				SELECT id, user_id, access_token,
					array_length(string_to_array(access_token, '.'), 1) AS segments,
					created_at, last_activity
				FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
					AND (access_token IS NULL OR array_length(string_to_array(access_token, '.'),1) IS DISTINCT FROM 3)
				ORDER BY created_at DESC
				LIMIT 200;
			$q$;
		ELSE
			-- Fallback: show basic session rows (no token column available)
			sql := $q$
				SELECT id, user_id, null::text AS access_token, null::int AS segments, created_at, last_activity
				FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
				ORDER BY created_at DESC
				LIMIT 200;
			$q$;
		END IF;
	EXECUTE sql;
END$$;

-- b) Count only (quick check)
-- Count malformed admin sessions (dynamic)
DO $$
DECLARE
	cnt INT;
BEGIN
		IF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'data'
		) THEN
			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
					AND (data->>'access_token' IS NULL OR array_length(string_to_array(data->>'access_token', '.'),1) IS DISTINCT FROM 3);
			$q$ INTO cnt;
		ELSIF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'access_token'
		) THEN
			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
					AND (access_token IS NULL OR array_length(string_to_array(access_token, '.'),1) IS DISTINCT FROM 3);
			$q$ INTO cnt;
		ELSE
			-- Fallback: no token column; count total admin sessions
			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
			$q$ INTO cnt;
		END IF;
	RAISE NOTICE 'malformed_admin_sessions=%', cnt;
END$$;

-- c) If your auth.sessions does not use JSON 'data' column (older), run this alternate preview
-- SELECT id, user_id, access_token, array_length(string_to_array(access_token, '.'), 1) AS segments
-- FROM auth.sessions
-- WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
--   AND (access_token IS NULL OR array_length(string_to_array(access_token, '.'),1) IS DISTINCT FROM 3)
-- LIMIT 200;

-- ==========================
-- 2) Safe remediation (run only after confirming preview results)
--    Delete only malformed admin sessions (by id) and then remove related refresh tokens for admin users.
-- ==========================

-- a) Delete malformed admin sessions
-- Delete malformed admin sessions (dynamic to accommodate schema differences)
DO $$
DECLARE
	del_sql TEXT;
BEGIN
		IF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'data'
		) THEN
			del_sql := $q$
				DELETE FROM auth.sessions
				WHERE id IN (
					SELECT id FROM auth.sessions
					WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
						AND (data->>'access_token' IS NULL OR array_length(string_to_array(data->>'access_token', '.'),1) IS DISTINCT FROM 3)
				);
			$q$;
		ELSIF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'access_token'
		) THEN
			del_sql := $q$
				DELETE FROM auth.sessions
				WHERE id IN (
					SELECT id FROM auth.sessions
					WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
						AND (access_token IS NULL OR array_length(string_to_array(access_token, '.'),1) IS DISTINCT FROM 3)
				);
			$q$;
		ELSE
			-- Fallback: no token fields available; delete all sessions for admin users by user_id
			del_sql := $q$
				DELETE FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
			$q$;
		END IF;
	EXECUTE del_sql;
	RAISE NOTICE 'Deleted malformed sessions for admin users (if any).';
END$$;

-- b) Optionally revoke all refresh tokens for admin users (forces re-login)
--    This is broader: it removes all refresh tokens for admin users so they must fully reauthenticate.
DELETE FROM auth.refresh_tokens
WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);

-- ==========================
-- 3) App-level session tracking: clear admin_sessions table (optional)
--    This removes your app's idea of who is signed in. Safe to run.
-- ==========================
TRUNCATE TABLE public.admin_sessions;

-- ==========================
-- 4) Optional: full force-logout (uncomment to run)
--    WARNING: this logs out every user in the project.
-- ==========================
-- TRUNCATE TABLE auth.sessions;
-- TRUNCATE TABLE auth.refresh_tokens;

-- ==========================
-- 5) Post-action diagnostics (verify)
-- ==========================
-- Post-action diagnostics: report counts via NOTICE to avoid missing-column errors
DO $$
DECLARE
	malformed_cnt INT := 0;
	total_cnt INT := 0;
BEGIN
		IF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'data'
		) THEN
			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
					AND (data->>'access_token' IS NULL OR array_length(string_to_array(data->>'access_token', '.'),1) IS DISTINCT FROM 3)
			$q$ INTO malformed_cnt;

			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
			$q$ INTO total_cnt;
		ELSIF EXISTS(
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'access_token'
		) THEN
			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
					AND (access_token IS NULL OR array_length(string_to_array(access_token, '.'),1) IS DISTINCT FROM 3)
			$q$ INTO malformed_cnt;

			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
			$q$ INTO total_cnt;
		ELSE
			-- Fallback: report total admin sessions
			EXECUTE $q$
				SELECT count(*) FROM auth.sessions
				WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users)
			$q$ INTO total_cnt;
			malformed_cnt := 0;
		END IF;

	RAISE NOTICE 'remaining_malformed_admin_sessions=%', malformed_cnt;
	RAISE NOTICE 'remaining_admin_sessions_total=%', total_cnt;
END$$;

-- ==========================
-- Notes / next steps
-- - Run the preview queries first (the SELECTs at the top) and inspect rows.
-- - If they show malformed tokens, run the deletion block (section 2a/2b) then the TRUNCATE for `public.admin_sessions`.
-- - Ask affected admins to clear browser localStorage (see project docs) or run:
--     localStorage.removeItem('supabase.auth.token'); localStorage.removeItem('supabase.auth'); await supabase.auth.signOut();
-- - If malformed tokens reappear immediately, inspect any custom code that writes to auth.sessions or proxies the auth endpoints.
-- =============================================================
