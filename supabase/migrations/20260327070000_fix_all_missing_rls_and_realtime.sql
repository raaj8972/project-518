-- Migration: 20260327070000_fix_all_missing_rls_and_realtime.sql
-- Description: 
-- 1. Add DELETE/UPDATE policies for registrations, auditions, and memberships for admins.
-- 2. Ensure REPLICA IDENTITY FULL for these tables to support detailed Realtime updates.
-- 3. Ensure tables are included in the supabase_realtime publication.

-- Enable RLS just in case they weren't enabled in baseline
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 1. Registrations
DROP POLICY IF EXISTS "registrations_admin_delete" ON public.registrations;
CREATE POLICY "registrations_admin_delete" ON public.registrations
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "registrations_admin_update" ON public.registrations;
CREATE POLICY "registrations_admin_update" ON public.registrations
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 2. Auditions
DROP POLICY IF EXISTS "auditions_admin_delete" ON public.auditions;
CREATE POLICY "auditions_admin_delete" ON public.auditions
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "auditions_admin_update" ON public.auditions;
CREATE POLICY "auditions_admin_update" ON public.auditions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 3. Memberships
DROP POLICY IF EXISTS "memberships_admin_delete" ON public.memberships;
CREATE POLICY "memberships_admin_delete" ON public.memberships
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "memberships_admin_update" ON public.memberships;
CREATE POLICY "memberships_admin_update" ON public.memberships
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 4. Notifications
DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;
CREATE POLICY "notifications_admin_delete" ON public.notifications
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "notifications_admin_update" ON public.notifications;
CREATE POLICY "notifications_admin_update" ON public.notifications
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- 5. Replica Identity Full
ALTER TABLE public.registrations REPLICA IDENTITY FULL;
ALTER TABLE public.auditions REPLICA IDENTITY FULL;
ALTER TABLE public.memberships REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 6. Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'registrations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'auditions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auditions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'memberships'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.memberships';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adjusting publication: %', SQLERRM;
END $$;
