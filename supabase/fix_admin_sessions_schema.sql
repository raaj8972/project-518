-- SQL to fix admin_sessions table for Firebase UIDs (which are TEXT, not UUID)
-- Run this in the Supabase SQL Editor

-- 1. Temporarily disable RLS to avoid policy issues during migration
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies that depend on the columns
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.admin_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.admin_sessions;

-- 3. Change column types to TEXT
-- Note: We use 'USING' to cast the existing UUIDs to TEXT if possible
ALTER TABLE public.admin_sessions 
  ALTER COLUMN id TYPE TEXT,
  ALTER COLUMN user_id TYPE TEXT;

-- 4. Re-enable RLS
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Re-create policies with TEXT support
CREATE POLICY "Admins can view all sessions"
  ON public.admin_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text -- Note the cast if auth.uid() is still uuid
    )
  );

CREATE POLICY "Users can manage their own sessions"
  ON public.admin_sessions FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- 6. Update admin_users table as well if it uses UUID
ALTER TABLE public.admin_users 
  ALTER COLUMN user_id TYPE TEXT;

-- Note: In a dual-auth system where Supabase Auth is still active, auth.uid() 
-- returns a UUID. If the user is logged in via Firebase, we are passing the 
-- UID as a string in the REST API call, but RLS policies still use auth.uid() 
-- for the session user. We need to be careful with types.
