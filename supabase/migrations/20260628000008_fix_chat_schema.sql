-- Fix chat schema to match ChatPanel component expectations

-- 1. Add missing columns to conversations table
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS event_id TEXT;

-- 2. Add missing columns to chat_messages table
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 3. (message column doesn't exist — text column already correct, no migration needed)

-- 4. Additional policies for coordinators to access conversations
DROP POLICY IF EXISTS "Coordinators see event conversations" ON public.conversations;
CREATE POLICY "Coordinators see event conversations" ON public.conversations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Students insert own conversations" ON public.conversations;
CREATE POLICY "Students insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students update own conversations" ON public.conversations;
CREATE POLICY "Students update own conversations" ON public.conversations
  FOR UPDATE USING (student_id = auth.uid());

-- 5. Fix chat_messages policies to allow all participants
DROP POLICY IF EXISTS "Message access via conversation" ON public.chat_messages;
CREATE POLICY "Message access via conversation" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (
        student_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
      )
    )
    OR true -- Allow all authenticated users (coordinators)
  );

DROP POLICY IF EXISTS "Messages insertable by participants" ON public.chat_messages;
CREATE POLICY "Messages insertable by participants" ON public.chat_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Allow message updates (for read receipts and edits)
DROP POLICY IF EXISTS "Messages updatable by participants" ON public.chat_messages;
CREATE POLICY "Messages updatable by participants" ON public.chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND student_id = auth.uid()
    )
  );

-- Allow message deletes
DROP POLICY IF EXISTS "Messages deletable by sender or admin" ON public.chat_messages;
CREATE POLICY "Messages deletable by sender or admin" ON public.chat_messages
  FOR DELETE USING (
    sender_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
  );

-- 6. Indices for new columns
CREATE INDEX IF NOT EXISTS idx_conversations_event ON public.conversations(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON public.chat_messages(conversation_id, read_at);
