-- Fix support chat and event chat unique constraints
-- Support chat: coordinator_id IS NULL AND event_id IS NULL (1 per student)
-- Event chat: coordinator_id IS NULL AND event_id IS NOT NULL (1 per student per event)

DO $$
BEGIN
  -- Make coordinator_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations'
      AND column_name = 'coordinator_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.conversations ALTER COLUMN coordinator_id DROP NOT NULL;
  END IF;

  -- Make event_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations'
      AND column_name = 'event_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.conversations ALTER COLUMN event_id DROP NOT NULL;
  END IF;
END $$;

-- Drop old unique constraint
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_student_id_coordinator_id_event_id_key;

-- 1 support chat per student (coordinator_id IS NULL AND event_id IS NULL)
DROP INDEX IF EXISTS uq_conv_support;
CREATE UNIQUE INDEX IF NOT EXISTS uq_conv_support
  ON public.conversations (student_id)
  WHERE coordinator_id IS NULL AND event_id IS NULL;

-- 1 event chat per student per event (coordinator_id IS NULL AND event_id IS NOT NULL)
DROP INDEX IF EXISTS uq_conv_event_student;
CREATE UNIQUE INDEX IF NOT EXISTS uq_conv_event_student
  ON public.conversations (student_id, event_id)
  WHERE coordinator_id IS NULL AND event_id IS NOT NULL;

-- 1 coordinator-specific chat per student per event per coordinator
DROP INDEX IF EXISTS uq_conv_coordinator;
CREATE UNIQUE INDEX IF NOT EXISTS uq_conv_coordinator
  ON public.conversations (student_id, coordinator_id, event_id)
  WHERE coordinator_id IS NOT NULL;

-- RLS: Select — students see their own, coordinators see by event_id, admins see all
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT USING (
    auth.uid() = student_id
    OR auth.uid() = coordinator_id
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- RLS: Insert — students create their own support and event chats
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Ensure realtime is enabled (safe — skips if already subscribed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
