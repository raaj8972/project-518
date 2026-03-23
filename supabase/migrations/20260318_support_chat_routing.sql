-- Support Chat Routing
-- Makes coordinator_id nullable so students can start chats with "Support" (Admins)

ALTER TABLE public.conversations 
  ALTER COLUMN coordinator_id DROP NOT NULL;

-- Ensure Admins can see all Support conversations (where coordinator_id IS NULL)
-- and also all other conversations for the student/coordinator they are managing.

DROP POLICY IF EXISTS "Admins see all conversations" ON public.conversations;
CREATE POLICY "Admins see all conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) OR
    auth.uid() = student_id OR
    auth.uid() = coordinator_id
  );

DROP POLICY IF EXISTS "Admins see all messages" ON public.chat_messages;
CREATE POLICY "Admins see all messages" ON public.chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND (student_id = auth.uid() OR coordinator_id = auth.uid())
    )
  );

-- Admins can Reply to Support conversations
DROP POLICY IF EXISTS "Admins reply to support" ON public.chat_messages;
CREATE POLICY "Admins reply to support" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND (student_id = auth.uid() OR coordinator_id = auth.uid())
    )
  );
