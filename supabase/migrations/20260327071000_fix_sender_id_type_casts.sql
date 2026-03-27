-- Migration: 20260327071000_fix_sender_id_type_casts.sql
-- Description: Fixes type mismatches in RLS policies for announcements and chat_messages where sender_id (text) is compared to auth.uid() (uuid).

-- ---------------------------------------------------------------
-- 1. Announcements: Fix type mismatches in policies
-- ---------------------------------------------------------------

-- INSERT: Fix sender_id = auth.uid() to use ::text
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()::text
    AND (
      -- Is an admin or owner
      EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()::text
          AND role IN ('admin', 'owner')
      )
      OR
      -- Is a coordinator (authenticated via supabase auth)
      sender_role = 'coordinator'
    )
  );

-- UPDATE: Fix sender_id = auth.uid() to use ::text
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()::text
    AND deleted_at IS NULL
  );

-- DELETE: Fix sender_id = auth.uid() to use ::text
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;
CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      sender_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()::text
          AND role = 'owner'
      )
    )
  );

-- ---------------------------------------------------------------
-- 2. chat_messages: Fix type mismatch in admin insert policy
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "chat_messages_insert_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_admin" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------
-- 3. biometric_profiles: Fix type mismatches
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "admin_own_biometric_select" ON public.biometric_profiles;
CREATE POLICY "admin_own_biometric_select" ON "public"."biometric_profiles"
FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "admin_own_biometric_insert" ON public.biometric_profiles;
CREATE POLICY "admin_own_biometric_insert" ON "public"."biometric_profiles"
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "admin_own_biometric_update" ON public.biometric_profiles;
CREATE POLICY "admin_own_biometric_update" ON "public"."biometric_profiles"
FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "admin_own_biometric_delete" ON public.biometric_profiles;
CREATE POLICY "admin_own_biometric_delete" ON "public"."biometric_profiles"
FOR DELETE USING (auth.uid()::text = user_id);

-- ---------------------------------------------------------------
-- 4. Ensure Real-time for announcements and chat_messages
-- ---------------------------------------------------------------

ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.biometric_profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'announcements'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'biometric_profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.biometric_profiles';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adjusting publication: %', SQLERRM;
END $$;

