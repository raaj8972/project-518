-- Account-scoped favourites, durable notifications, and event reminders.
BEGIN;
CREATE TABLE IF NOT EXISTS public.student_saved_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,event_id)
);
CREATE TABLE IF NOT EXISTS public.student_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_minutes integer NOT NULL DEFAULT 30 CHECK(reminder_minutes IN(0,15,30,60))
);
CREATE TABLE IF NOT EXISTS public.student_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN('registration','invitation','venue','schedule','reminder')),
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL CHECK(href LIKE '/dashboard/%'),
  source_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE(user_id,source_key)
);
CREATE INDEX IF NOT EXISTS student_inbox_user_date ON public.student_inbox(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS student_inbox_unread ON public.student_inbox(user_id) WHERE read_at IS NULL;
ALTER TABLE public.student_saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_inbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_saved_events,public.student_notification_preferences,public.student_inbox FROM anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.student_saved_events TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.student_notification_preferences TO authenticated;
GRANT SELECT ON public.student_inbox TO authenticated;
GRANT UPDATE(read_at) ON public.student_inbox TO authenticated;
GRANT ALL ON public.student_saved_events,public.student_notification_preferences,public.student_inbox TO service_role;
DROP POLICY IF EXISTS student_saved_own ON public.student_saved_events;
CREATE POLICY student_saved_own ON public.student_saved_events TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS student_preferences_own ON public.student_notification_preferences;
CREATE POLICY student_preferences_own ON public.student_notification_preferences TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS student_inbox_read_own ON public.student_inbox;
CREATE POLICY student_inbox_read_own ON public.student_inbox FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS student_inbox_update_own ON public.student_inbox;
CREATE POLICY student_inbox_update_own ON public.student_inbox FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- Parse confirmed ISO dates and both 24h / AM-PM times (including a time range).
CREATE OR REPLACE FUNCTION public.student_event_start(p_date text,p_time text)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE parts text[]; h integer; m integer; d date;
BEGIN
  IF p_date IS NULL OR p_date !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
  d:=p_date::date;
  parts:=regexp_match(upper(trim(p_time)), '^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?(?:\s*(?:IST|[-–—]).*)?$');
  IF parts IS NULL THEN
    parts:=regexp_match(upper(trim(p_time)), '^(\d{1,2})\s*(AM|PM)(?:\s*(?:IST|[-–—]).*)?$');
    IF parts IS NULL THEN RETURN NULL; END IF;
    parts:=ARRAY[parts[1],'00',parts[2]];
  END IF;
  h:=parts[1]::integer; m:=parts[2]::integer;
  IF m>59 OR h>23 OR (parts[3] IS NOT NULL AND (h<1 OR h>12)) THEN RETURN NULL; END IF;
  IF parts[3] IS NOT NULL THEN h:=h%12+CASE WHEN parts[3]='PM' THEN 12 ELSE 0 END; END IF;
  RETURN (d+make_time(h,m,0)) AT TIME ZONE 'Asia/Kolkata';
EXCEPTION WHEN others THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.student_registration_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
    VALUES(NEW.user_id,'registration',coalesce(NEW.event_title,'Event')||' · '||replace(coalesce(NEW.status,'pending'),'_',' '),
      'Your registration is '||replace(coalesce(NEW.status,'pending'),'_',' ')||'. Open your registrations for details.',
      '/dashboard/events?view=registrations','registration:'||NEW.id||':'||gen_random_uuid()::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS student_registration_notice ON public.registrations;
CREATE TRIGGER student_registration_notice AFTER INSERT OR UPDATE OF status ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.student_registration_notice();

CREATE OR REPLACE FUNCTION public.student_invitation_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.receiver_id IS NOT NULL AND NEW.status='pending' AND (TG_OP='INSERT' OR OLD.receiver_id IS DISTINCT FROM NEW.receiver_id OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
    VALUES(NEW.receiver_id,'invitation','You have a team invitation','Review your invitation and meet your teammates.','/dashboard/teams','invite:'||NEW.id||':pending:'||NEW.receiver_id)
    ON CONFLICT(user_id,source_key) DO NOTHING;
  ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN('accepted','rejected') THEN
    INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
    VALUES(NEW.sender_id,'invitation','Team invitation '||NEW.status,'A teammate has '||NEW.status||' your invitation.','/dashboard/teams','invite:'||NEW.id||':'||NEW.status)
    ON CONFLICT(user_id,source_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS student_invitation_notice ON public.group_invitations;
CREATE TRIGGER student_invitation_notice AFTER INSERT OR UPDATE ON public.group_invitations FOR EACH ROW EXECUTE FUNCTION public.student_invitation_notice();

CREATE OR REPLACE FUNCTION public.student_event_change_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE change_kind text; notice_body text; version text:=gen_random_uuid()::text;
BEGIN
  IF NEW.venue IS NOT DISTINCT FROM OLD.venue AND NEW.date IS NOT DISTINCT FROM OLD.date AND NEW.time IS NOT DISTINCT FROM OLD.time THEN RETURN NEW; END IF;
  change_kind:=CASE WHEN NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time THEN 'schedule' ELSE 'venue' END;
  notice_body:='When: '||coalesce(nullif(NEW.date,''),'Date to be announced')||' · '||coalesce(nullif(NEW.time,''),'Time to be announced')||'. Venue: '||coalesce(nullif(NEW.venue,''),'To be announced')||'.';
  INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
  SELECT DISTINCT r.user_id,change_kind,NEW.title||' · '||CASE WHEN change_kind='venue' THEN 'venue changed' ELSE 'schedule changed' END,
    notice_body,'/dashboard/events?view=registrations','event-change:'||NEW.id||':'||version
  FROM public.registrations r WHERE r.event_id=NEW.id AND r.user_id IS NOT NULL AND r.deleted_at IS NULL AND r.status IS DISTINCT FROM 'rejected';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS student_event_change_notice ON public.events;
CREATE TRIGGER student_event_change_notice AFTER UPDATE OF venue,date,time ON public.events FOR EACH ROW EXECUTE FUNCTION public.student_event_change_notice();

CREATE OR REPLACE FUNCTION public.deliver_student_reminders(p_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE delivered integer;
BEGIN
  INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
  SELECT DISTINCT r.user_id,'reminder',e.title||' starts soon',
    'Starts at '||e.time||' on '||e.date||'. Venue: '||coalesce(nullif(e.venue,''),'To be announced')||'.',
    '/dashboard/events?view=registrations','reminder:'||e.id||':'||to_char(public.student_event_start(e.date,e.time) AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS')||'+00'
  FROM public.registrations r JOIN public.events e ON e.id=r.event_id
  LEFT JOIN public.student_notification_preferences p ON p.user_id=r.user_id
  WHERE r.user_id IS NOT NULL AND (p_user_id IS NULL OR r.user_id=p_user_id)
    AND r.status='approved' AND r.deleted_at IS NULL AND e.visible IS DISTINCT FROM false
    AND coalesce(p.reminder_minutes,30)>0
    AND public.student_event_start(e.date,e.time)>now()
    AND public.student_event_start(e.date,e.time)<=now()+make_interval(mins=>coalesce(p.reminder_minutes,30))
  ON CONFLICT(user_id,source_key) DO NOTHING;
  GET DIAGNOSTICS delivered=ROW_COUNT;
  RETURN delivered;
END $$;
CREATE OR REPLACE FUNCTION public.refresh_my_student_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  RETURN public.deliver_student_reminders(auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.student_event_start(text,text),public.student_registration_notice(),public.student_invitation_notice(),public.student_event_change_notice(),public.deliver_student_reminders(uuid),public.refresh_my_student_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_student_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_student_reminders(uuid) TO service_role;

-- Seed existing students with their current registrations and pending invitations once.
INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
SELECT r.user_id,'registration',r.event_title||' · '||replace(coalesce(r.status,'pending'),'_',' '),'Your current registration status.','/dashboard/events?view=registrations','registration-initial:'||r.id
FROM public.registrations r WHERE r.user_id IS NOT NULL AND r.deleted_at IS NULL
ON CONFLICT(user_id,source_key) DO NOTHING;
INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key)
SELECT receiver_id,'invitation','You have a team invitation','Review your invitation and meet your teammates.','/dashboard/teams','invite:'||id||':pending:'||receiver_id
FROM public.group_invitations WHERE receiver_id IS NOT NULL AND status='pending'
ON CONFLICT(user_id,source_key) DO NOTHING;
DO $$ DECLARE t text;
BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['student_inbox','student_saved_events','student_notification_preferences'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
      END IF;
    END LOOP;
  END IF;
END $$;
-- Supabase Cron runs reminders even when a student's dashboard is closed.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule('student-event-reminders','* * * * *','select public.deliver_student_reminders();');
  END IF;
END $$;
COMMIT;
