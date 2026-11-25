-- Explicit event/coordinator and technical/admin support channels.
BEGIN;
CREATE OR REPLACE FUNCTION public.can_manage_technical_support()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.session_is_current() AND public.admin_can_manage_pages(ARRAY['support-chat'],ARRAY[]::text[])
$$;
CREATE OR REPLACE FUNCTION public.support_can_participate(p_id uuid,p_mode text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.session_is_current() AND EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=p_id AND (
    (p_mode='student' AND c.student_id=auth.uid()) OR
    (p_mode='coordinator' AND c.event_id IS NOT NULL AND public.coordinates_event(c.event_id::text)) OR
    (p_mode='admin' AND c.event_id IS NULL AND public.can_manage_technical_support())
  ))
$$;
CREATE OR REPLACE FUNCTION public.can_read_conversation(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.support_can_participate(p_id,'student') OR public.support_can_participate(p_id,'coordinator') OR public.support_can_participate(p_id,'admin')
$$;
CREATE OR REPLACE FUNCTION public.support_messaging_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.session_is_current() AND NOT EXISTS(SELECT 1 FROM public.site_settings WHERE chat_locked IS TRUE)
$$;
CREATE OR REPLACE FUNCTION public.student_support_destination_allowed(p_event_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.session_is_current() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid())
    AND (p_event_id IS NULL OR EXISTS(SELECT 1 FROM public.events WHERE id=p_event_id AND visible IS DISTINCT FROM false))
$$;
-- Lock destinations and author identity. Scoped RPCs provide writes and read receipts.
REVOKE INSERT,UPDATE,DELETE ON public.conversations,public.chat_messages FROM authenticated,anon;
GRANT SELECT ON public.conversations,public.chat_messages TO authenticated;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN('conversations','chat_messages') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS support_message_activity ON public.chat_messages(conversation_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS support_messages_unread ON public.chat_messages(conversation_id) WHERE read_at IS NULL;
CREATE POLICY support_conversations_read ON public.conversations FOR SELECT TO authenticated USING(public.can_read_conversation(id));
CREATE POLICY support_messages_read ON public.chat_messages FOR SELECT TO authenticated USING(public.can_read_conversation(conversation_id));
-- Keep existing clients able to send while enforcing the same routing and identity checks.
GRANT INSERT(student_id,coordinator_id,event_id) ON public.conversations TO authenticated;
GRANT INSERT(conversation_id,sender_id,sender_role,text) ON public.chat_messages TO authenticated;
CREATE POLICY support_legacy_open ON public.conversations FOR INSERT TO authenticated WITH CHECK(
  public.session_is_current() AND student_id=auth.uid() AND coordinator_id IS NULL
  AND public.student_support_destination_allowed(event_id)
);
CREATE POLICY support_legacy_send ON public.chat_messages FOR INSERT TO authenticated WITH CHECK(
  sender_id=auth.uid() AND public.support_can_participate(conversation_id,sender_role::text)
  AND nullif(trim(text),'') IS NOT NULL AND length(text)<=4000
  AND public.support_messaging_enabled()
);


CREATE OR REPLACE FUNCTION public.open_student_support(p_event_id text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE convo uuid;
BEGIN
  IF NOT public.session_is_current() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Student sign-in required'; END IF;
  IF p_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.events e WHERE e.id=p_event_id AND (e.visible IS DISTINCT FROM false OR EXISTS(SELECT 1 FROM public.registrations r WHERE r.event_id=e.id AND r.user_id=auth.uid() AND r.deleted_at IS NULL) OR EXISTS(SELECT 1 FROM public.conversations c WHERE c.student_id=auth.uid() AND c.event_id=e.id))) THEN
    RAISE EXCEPTION 'Event is unavailable';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||coalesce(p_event_id,'technical'),0));
  SELECT id INTO convo FROM public.conversations WHERE student_id=auth.uid() AND event_id IS NOT DISTINCT FROM p_event_id ORDER BY created_at,id LIMIT 1;
  IF convo IS NULL THEN
    INSERT INTO public.conversations(student_id,coordinator_id,event_id) VALUES(auth.uid(),NULL,p_event_id) RETURNING id INTO convo;
  END IF;
  RETURN convo;
END $$;

CREATE OR REPLACE FUNCTION public.support_conversation_list(p_mode text,p_event_id text DEFAULT NULL)
RETURNS TABLE(id uuid,student_id uuid,event_id text,created_at timestamptz,label text,subtitle text,last_message text,last_activity timestamptz,unread_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.session_is_current() THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_mode='admin' THEN
    IF NOT public.can_manage_technical_support() OR p_event_id IS NOT NULL THEN RAISE EXCEPTION 'Technical support access required'; END IF;
  ELSIF p_mode='coordinator' THEN
    IF p_event_id IS NULL OR NOT public.coordinates_event(p_event_id) THEN RAISE EXCEPTION 'Your assigned event is required'; END IF;
  ELSIF p_mode<>'student' THEN RAISE EXCEPTION 'Invalid support role'; END IF;
  RETURN QUERY
  SELECT c.id,c.student_id,c.event_id,c.created_at,
    CASE WHEN p_mode='student' THEN coalesce(e.title,'Technical support') ELSE coalesce(nullif(p.full_name,''),'Student') END,
    CASE WHEN p_mode='student' THEN CASE WHEN c.event_id IS NULL THEN 'Technical team' ELSE 'Event coordinator' END ELSE CASE WHEN c.event_id IS NULL THEN 'Technical support request' ELSE coalesce(e.title,'Event help') END END,
    coalesce(latest.text,''),coalesce(latest.created_at,c.created_at),
    (SELECT count(*) FROM public.chat_messages m WHERE m.conversation_id=c.id AND m.expires_at>now() AND m.read_at IS NULL
      AND CASE WHEN p_mode='student' THEN m.sender_role::text<>'student' ELSE m.sender_role::text='student' END)
  FROM public.conversations c LEFT JOIN public.profiles p ON p.id=c.student_id LEFT JOIN public.events e ON e.id=c.event_id
  LEFT JOIN LATERAL(SELECT m.text,m.created_at FROM public.chat_messages m WHERE m.conversation_id=c.id AND m.expires_at>now() ORDER BY m.created_at DESC,m.id DESC LIMIT 1) latest ON true
  WHERE public.support_can_participate(c.id,p_mode)
    AND CASE WHEN p_mode='student' THEN c.event_id IS NOT DISTINCT FROM p_event_id WHEN p_mode='coordinator' THEN c.event_id=p_event_id ELSE c.event_id IS NULL END
  ORDER BY coalesce(latest.created_at,c.created_at) DESC,c.id DESC;
END $$;
CREATE OR REPLACE FUNCTION public.support_unread_count(p_mode text,p_event_id text DEFAULT NULL)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT coalesce(sum(unread_count),0)::bigint FROM public.support_conversation_list(p_mode,p_event_id)
$$;
CREATE OR REPLACE FUNCTION public.support_send_message(p_conversation_id uuid,p_mode text,p_text text)
RETURNS public.chat_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE msg public.chat_messages;
BEGIN
  IF NOT public.support_can_participate(p_conversation_id,p_mode) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
  IF EXISTS(SELECT 1 FROM public.site_settings WHERE chat_locked IS TRUE) THEN RAISE EXCEPTION 'Chat is temporarily locked'; END IF;
  IF nullif(trim(p_text),'') IS NULL OR length(p_text)>4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4000 characters'; END IF;
  INSERT INTO public.chat_messages(conversation_id,sender_id,sender_role,text)
    VALUES(p_conversation_id,auth.uid(),p_mode::public.sender_role_type,trim(p_text)) RETURNING * INTO msg;
  RETURN msg;
END $$;
CREATE OR REPLACE FUNCTION public.support_mark_read(p_conversation_id uuid,p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.support_can_participate(p_conversation_id,p_mode) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
  UPDATE public.chat_messages SET read_at=now() WHERE conversation_id=p_conversation_id AND read_at IS NULL AND expires_at>now()
    AND CASE WHEN p_mode='student' THEN sender_role::text<>'student' ELSE sender_role::text='student' END;
END $$;
CREATE OR REPLACE FUNCTION public.support_edit_message(p_message_id uuid,p_mode text,p_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE msg public.chat_messages;
BEGIN
  SELECT * INTO msg FROM public.chat_messages WHERE id=p_message_id;
  IF NOT FOUND OR NOT public.support_can_participate(msg.conversation_id,p_mode) OR msg.sender_id<>auth.uid() OR msg.sender_role::text<>p_mode OR msg.expires_at<=now() THEN RAISE EXCEPTION 'Message edit denied'; END IF;
  IF EXISTS(SELECT 1 FROM public.site_settings WHERE chat_locked IS TRUE) THEN RAISE EXCEPTION 'Chat is temporarily locked'; END IF;
  IF nullif(trim(p_text),'') IS NULL OR length(p_text)>4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4000 characters'; END IF;
  UPDATE public.chat_messages SET text=trim(p_text),updated_at=now() WHERE id=p_message_id;
END $$;
CREATE OR REPLACE FUNCTION public.support_delete_message(p_message_id uuid,p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE msg public.chat_messages;
BEGIN
  SELECT * INTO msg FROM public.chat_messages WHERE id=p_message_id;
  IF NOT FOUND OR NOT public.support_can_participate(msg.conversation_id,p_mode) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
  IF p_mode='student' AND (msg.sender_id<>auth.uid() OR msg.sender_role::text<>'student') THEN RAISE EXCEPTION 'Message deletion denied'; END IF;
  DELETE FROM public.chat_messages WHERE id=p_message_id;
END $$;
CREATE OR REPLACE FUNCTION public.support_clear_conversation(p_conversation_id uuid,p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_mode NOT IN('admin','coordinator') OR NOT public.support_can_participate(p_conversation_id,p_mode) THEN RAISE EXCEPTION 'Staff access required'; END IF;
  DELETE FROM public.chat_messages WHERE conversation_id=p_conversation_id;
END $$;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('support_messaging_enabled','student_support_destination_allowed','can_read_conversation','can_manage_technical_support','support_can_participate','open_student_support','support_conversation_list','support_unread_count','support_send_message','support_mark_read','support_edit_message','support_delete_message','support_clear_conversation') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;

-- Reply notifications share the student's existing inbox.
ALTER TABLE public.student_inbox DROP CONSTRAINT IF EXISTS student_inbox_kind_check;
ALTER TABLE public.student_inbox ADD CONSTRAINT student_inbox_kind_check CHECK(kind IN('registration','invitation','venue','schedule','reminder','support'));
CREATE OR REPLACE FUNCTION public.student_support_reply_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.conversations; event_title text;
BEGIN
  IF NEW.sender_role::text='student' THEN RETURN NEW; END IF;
  SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id;
  SELECT title INTO event_title FROM public.events WHERE id=c.event_id;
  INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
  VALUES(c.student_id,'support',CASE WHEN c.event_id IS NULL THEN 'Technical support replied' ELSE coalesce(event_title,'Event coordinator')||' · new reply' END,
    left(NEW.text,180),CASE WHEN c.event_id IS NULL THEN '/dashboard/messages?type=technical' ELSE '/dashboard/messages?type=event&event='||c.event_id END,
    'support-reply:'||NEW.id)
  ON CONFLICT(user_id,source_key) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.student_support_reply_notice() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS student_support_reply_notice ON public.chat_messages;
CREATE TRIGGER student_support_reply_notice AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.student_support_reply_notice();
DO $$ DECLARE t text; BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['conversations','chat_messages'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END IF;
    END LOOP;
  END IF;
END $$;
COMMIT;
