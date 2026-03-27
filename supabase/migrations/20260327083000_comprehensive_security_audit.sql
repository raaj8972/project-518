-- Migration: 20260327083000_comprehensive_security_audit.sql
-- Description:
-- 1. Lock down administrative tables (admin_users, admin_permissions, allowed_admins, site_settings, security_settings).
-- 2. Fix Shoutouts RLS (Allow student INSERT/DELETE own, Admin DELETE all).
-- 3. Fix Profiles RLS (Allow Admin DELETE).
-- 4. Fix Annual Sports Registrations (Strictly own read/write for students, Admin all).
-- 5. Ensure all tables are in the realtime publication.

-- 1. Administrative Table Lockdown
-- admin_users: restrict SELECT to admins/owners
DROP POLICY IF EXISTS "Public Read Admin Users" ON public.admin_users;
CREATE POLICY "admin_users_admin_select" ON public.admin_users
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users sub
      WHERE sub.user_id = auth.uid()::text
        AND sub.role IN ('admin', 'owner')
    )
  );

-- admin_permissions: restrict SELECT to admins/owners
DROP POLICY IF EXISTS "Public Read Admin Permissions" ON public.admin_permissions;
CREATE POLICY "admin_permissions_admin_select" ON public.admin_permissions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- security_settings: only admins read
DROP POLICY IF EXISTS "Public can read security settings" ON public.security_settings;
CREATE POLICY "security_settings_admin_all" ON public.security_settings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- site_settings: only admins manage, everyone read
DROP POLICY IF EXISTS "site_settings_select" ON public.site_settings;
CREATE POLICY "site_settings_read_all" ON public.site_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
CREATE POLICY "site_settings_admin_update" ON public.site_settings
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 2. Shoutouts Fixes
-- Enable INSERT for authenticated users
DROP POLICY IF EXISTS "shoutouts_insert" ON public.shoutouts;
CREATE POLICY "shoutouts_insert" ON public.shoutouts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Enable DELETE for own or admins
DROP POLICY IF EXISTS "shoutouts_delete" ON public.shoutouts;
CREATE POLICY "shoutouts_delete" ON public.shoutouts
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()::text
          AND role IN ('admin', 'owner')
      )
    )
  );

-- 3. Profiles Admin Management
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 4. Annual Sports Registrations (Strict Student Isolation)
DROP POLICY IF EXISTS "Public Insert Registrations" ON public.annual_sports_registrations;
DROP POLICY IF EXISTS "Admins Manage Registrations" ON public.annual_sports_registrations;

-- Students insert own
CREATE POLICY "annual_sports_insert_own" ON public.annual_sports_registrations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Students select/update own
CREATE POLICY "annual_sports_own_all" ON public.annual_sports_registrations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "annual_sports_own_update" ON public.annual_sports_registrations
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Admins manage all
CREATE POLICY "annual_sports_admin_all" ON public.annual_sports_registrations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 5. Pass Scans (Scanner Security)
DROP POLICY IF EXISTS "Public insert scans" ON public.pass_scans;
CREATE POLICY "pass_scans_insert_authenticated" ON public.pass_scans
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'shoutouts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'annual_sports_registrations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_sports_registrations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'pass_scans'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pass_scans';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'sports_registrations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sports_registrations';
  END IF;
END $$;
