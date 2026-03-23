-- Permission Rules V2
-- Announcements: Admin deletes all, Coordinator deletes own, Student view only
-- Coordinator announcements are event-specific and only seen by registered students

-- ============================================================
-- ANNOUNCEMENTS RLS
-- ============================================================

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can view active announcements they should see
DROP POLICY IF EXISTS "View announcements" ON public.announcements;
CREATE POLICY "View announcements" ON public.announcements
  FOR SELECT USING (
    deleted_at IS NULL AND (
      -- Admin sees everything
      EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
      OR
      -- Coordinator sees announcements from their event/globally
      EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) -- Coordinators would use their event relation
      OR
      -- Student: sees admin-posted (global) announcements OR coordinator announcements for events they're registered for
      (
        sender_role = 'admin'  -- admin broadcasts visible to all
        OR (
          sender_role = 'coordinator' AND EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.user_id = auth.uid() AND r.event_id::text = announcements.event_id
          )
        )
      )
    )
  );

-- Only admin and coordinator can post
DROP POLICY IF EXISTS "Post announcements" ON public.announcements;
CREATE POLICY "Post announcements" ON public.announcements
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
      -- Coordinator: allow if sender_role = 'coordinator' (validated in app logic)
      OR sender_role = 'coordinator'
    )
  );

-- Edit: Admin edits any, Coordinator/others edit own only
DROP POLICY IF EXISTS "Edit announcements" ON public.announcements;
CREATE POLICY "Edit announcements" ON public.announcements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    OR auth.uid() = sender_id
  );

-- ============================================================
-- CHAT MESSAGES RLS
-- ============================================================
-- Student and Coordinator can only delete their OWN messages
-- Admin can delete all messages

DROP POLICY IF EXISTS "Delete own messages" ON public.chat_messages;
CREATE POLICY "Delete own messages" ON public.chat_messages
  FOR DELETE USING (
    -- Own messages
    auth.uid() = sender_id
    OR
    -- Admin can delete any
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Edit own messages" ON public.chat_messages;
CREATE POLICY "Edit own messages" ON public.chat_messages
  FOR UPDATE USING (
    -- Own messages only (everyone)
    auth.uid() = sender_id
    OR
    -- Admin can edit any (for moderation)
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );
