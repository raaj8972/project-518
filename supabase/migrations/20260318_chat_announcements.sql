
-- Phase 2: Chat and Announcements (Fixed v2)
-- Run this in Supabase SQL Editor

-- ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_target') THEN
    CREATE TYPE announcement_target AS ENUM ('all', 'students', 'coordinators');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sender_role_type') THEN
    CREATE TYPE sender_role_type AS ENUM ('admin', 'coordinator', 'student');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text         TEXT NOT NULL,
  urgent       BOOLEAN NOT NULL DEFAULT FALSE,
  target       announcement_target NOT NULL DEFAULT 'all',
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role  sender_role_type NOT NULL DEFAULT 'admin',
  event_id     TEXT, -- Store event ID as text to match events.id (integer/text/uuid varies)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coordinator_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, coordinator_id, event_id)
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role      sender_role_type NOT NULL,
  text             TEXT NOT NULL,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 days')
);

DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_announcements_target  ON public.announcements(target) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_event   ON public.announcements(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coord   ON public.conversations(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_convo   ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_expires ON public.chat_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- RLS
ALTER TABLE public.announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages   ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
$$;

-- FIX: event_coordinators instead of coordinator_passwords
CREATE OR REPLACE FUNCTION public.is_coordinator(uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_coordinators WHERE user_id = uid);
$$;

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner(auth.uid()) OR public.is_coordinator(auth.uid()));

DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;
CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR coordinator_id = auth.uid()
    OR public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    expires_at > NOW()
    AND (
      sender_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.student_id = auth.uid() OR c.coordinator_id = auth.uid())
      )
      OR public.is_admin_or_owner(auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.coordinator_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;
CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "chat_messages_delete" ON public.chat_messages;
CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_admin_or_owner(auth.uid()));

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- USER PRESENCE
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online  BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select" ON public.user_presence;
CREATE POLICY "presence_select" ON public.user_presence
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "presence_upsert" ON public.user_presence;
CREATE POLICY "presence_upsert" ON public.user_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- AUTO-DELETE cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE expires_at < NOW();
END;
$$;
