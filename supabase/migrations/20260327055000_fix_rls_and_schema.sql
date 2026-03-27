-- =============================================================
-- Fix RLS violations and schema mismatches (2026-03-27)
-- Bugs fixed:
--   1. admin_users missing last_login column (AuthContext crash)
--   2. announcements table has NO INSERT/UPDATE/DELETE policies
--   3. chat_messages INSERT policy blocks admin users
--   4. admin_users UPDATE policy blocks owners from managing admins
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Add missing last_login column to admin_users
-- ---------------------------------------------------------------
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- ---------------------------------------------------------------
-- 2. Announcements: Add INSERT / UPDATE / DELETE policies
-- ---------------------------------------------------------------

-- INSERT: authenticated admins/owners/coordinators can post
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
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

-- UPDATE: own announcements only (admin/coordinator)
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    AND deleted_at IS NULL
  );

-- DELETE: own announcements, or owners can delete any
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;
CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      sender_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()::text
          AND role = 'owner'
      )
    )
  );

-- ---------------------------------------------------------------
-- 3. chat_messages: Add admin bypass INSERT policy
--    Existing policy requires being in conversations table.
--    Admins need to reply to student chats without that constraint.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "chat_messages_insert_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_admin" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()::text
        AND role IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------
-- 4. admin_users UPDATE: allow owners to update any admin row
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can update any admin profile" ON public.admin_users;
CREATE POLICY "Owners can update any admin profile" ON public.admin_users
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Self-update (existing base rule)
      auth.uid()::text = user_id
      OR
      -- Owner can update any row
      EXISTS (
        SELECT 1 FROM public.admin_users self_row
        WHERE self_row.user_id = auth.uid()::text
          AND self_row.role = 'owner'
      )
    )
  );
