-- Force logout of all admins by deleting their sessions from auth.sessions
-- and clearing the application-level session tracking table.

-- 1. Clear application-level session tracking
TRUNCATE TABLE public.admin_sessions;

-- 2. Delete Supabase Auth sessions for users who are in the admin_users table.
-- Note: This requires permissions to access the auth schema.
-- If running from the Supabase Dashboard SQL Editor, this should work.
-- We cast to text to avoid "operator does not exist: character varying = uuid" errors
-- in case of schema mismatches.

DELETE FROM auth.sessions
WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);

-- 3. Optionally, you can also revoke refresh tokens to be sure.
DELETE FROM auth.refresh_tokens
WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);

-- 4. If you want to force logout EVERYONE (not just admins), uncomment below:
-- TRUNCATE TABLE auth.sessions;
-- TRUNCATE TABLE auth.refresh_tokens;
