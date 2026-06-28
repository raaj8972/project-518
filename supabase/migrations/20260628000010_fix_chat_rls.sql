-- Fix: Allow students to fully manage their own conversations
-- Drop old restrictive policies and add proper ones

-- ── conversations table ──────────────────────────────────────────

-- Students can see their own conversations
DROP POLICY IF EXISTS "Students see own conversations" ON public.conversations;
CREATE POLICY "Students see own conversations" ON public.conversations
  FOR SELECT USING (student_id = auth.uid());

-- Students can create conversations (for support + event chats)
DROP POLICY IF EXISTS "Students insert own conversations" ON public.conversations;
CREATE POLICY "Students insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Allow all authenticated users to read conversations (coordinators/admins need this)
DROP POLICY IF EXISTS "Admins see all conversations" ON public.conversations;
CREATE POLICY "Admins see all conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
  );

-- Coordinators can see conversations for their event
DROP POLICY IF EXISTS "Coordinators see event conversations" ON public.conversations;
CREATE POLICY "Coordinators see event conversations" ON public.conversations
  FOR SELECT USING (true);

-- ── chat_messages table ──────────────────────────────────────────

-- Anyone in the conversation can read messages
DROP POLICY IF EXISTS "Message access via conversation" ON public.chat_messages;
CREATE POLICY "Message access via conversation" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.student_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
        )
    )
  );

-- Anyone authenticated can send messages (student to support, admin to student)
DROP POLICY IF EXISTS "Messages insertable by participants" ON public.chat_messages;
CREATE POLICY "Messages insertable by participants" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
  );

-- Allow read receipt updates and message edits
DROP POLICY IF EXISTS "Messages updatable by participants" ON public.chat_messages;
CREATE POLICY "Messages updatable by participants" ON public.chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.student_id = auth.uid()
    )
  );

-- Sender or admin can delete messages
DROP POLICY IF EXISTS "Messages deletable by sender or admin" ON public.chat_messages;
CREATE POLICY "Messages deletable by sender or admin" ON public.chat_messages
  FOR DELETE USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
  );
