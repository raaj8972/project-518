-- 1. Announcements Table
-- Targets: 'all', 'students', 'admins', 'coordinators'
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('general', 'urgent', 'event', 'system')),
    content TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ
);

-- 2. Chat System: Conversations
-- Links students to the support team
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Chat System: Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS Policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Announcements: Everyone can view, only admins/owners can manage
CREATE POLICY "Announcements viewable by all" ON public.announcements
    FOR SELECT USING (true);

CREATE POLICY "Announcements manageable by admins" ON public.announcements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'owner'))
    );

-- Conversations: Students see their own, admins see all
CREATE POLICY "Students see own conversations" ON public.conversations
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins see all conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)
    );

-- Messages: Access depends on conversation access
CREATE POLICY "Message access via conversation" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)))
    );

CREATE POLICY "Messages insertable by participants" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text)))
    );

-- 5. Auto-Purge Messages (5-day policy)
-- This function can be scheduled via pg_cron or called periodically
CREATE OR REPLACE FUNCTION public.purge_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.chat_messages
    WHERE created_at < (now() - INTERVAL '5 days');
END;
$$;

-- 6. Indices
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON public.announcements(target, created_at DESC);
