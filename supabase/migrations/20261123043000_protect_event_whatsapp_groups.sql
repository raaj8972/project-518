-- Event invitations belong to approved, active participants and scoped event staff.
BEGIN;
CREATE TABLE IF NOT EXISTS public.event_whatsapp_groups (
 event_id text PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
 whatsapp_group_link text NOT NULL CHECK (length(trim(whatsapp_group_link))>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_whatsapp_groups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_whatsapp_groups FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.event_whatsapp_groups TO authenticated;
GRANT ALL ON public.event_whatsapp_groups TO service_role;
CREATE OR REPLACE FUNCTION public.can_manage_event_whatsapp_group(p_event_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.session_is_current() AND (
  public.coordinates_event(p_event_id) OR
  public.admin_can_manage_pages(ARRAY['events','registrations'],ARRAY['can_events','can_registrations'])
 )
$$;
CREATE OR REPLACE FUNCTION public.can_read_event_whatsapp_group(p_event_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.can_manage_event_whatsapp_group(p_event_id) OR (
  public.session_is_current() AND EXISTS (
   SELECT 1 FROM public.registrations r WHERE r.event_id=p_event_id AND r.user_id=auth.uid()
   AND r.status='approved' AND r.is_active IS TRUE AND r.deleted_at IS NULL
  )
 )
$$;
DROP POLICY IF EXISTS event_whatsapp_group_read ON public.event_whatsapp_groups;
CREATE POLICY event_whatsapp_group_read ON public.event_whatsapp_groups FOR SELECT TO authenticated
 USING (public.can_read_event_whatsapp_group(event_id));

-- Move existing invitations out of public events, including public embedded/select-* reads.
INSERT INTO public.event_whatsapp_groups(event_id,whatsapp_group_link)
 SELECT id,trim(whatsapp_group_link) FROM public.events WHERE nullif(trim(whatsapp_group_link),'') IS NOT NULL
 ON CONFLICT(event_id) DO UPDATE SET whatsapp_group_link=EXCLUDED.whatsapp_group_link,updated_at=now();
UPDATE public.events SET whatsapp_group_link=NULL WHERE whatsapp_group_link IS NOT NULL;

-- Preserve existing admin/coordinator event forms, but never persist links in public rows.
-- Empty string clears a link; omitted/null values leave the protected value unchanged.
CREATE OR REPLACE FUNCTION public.store_private_event_whatsapp_group() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.whatsapp_group_link IS NOT NULL THEN
  IF NOT public.can_manage_event_whatsapp_group(NEW.id) AND
     coalesce(auth.jwt()->>'role','')<>'service_role' AND NOT(auth.uid() IS NULL AND session_user IN('postgres','supabase_admin')) THEN
   RAISE EXCEPTION 'Assigned coordinator or event administrator required';
  END IF;
  IF nullif(trim(NEW.whatsapp_group_link),'') IS NULL THEN
   DELETE FROM public.event_whatsapp_groups WHERE event_id=NEW.id;
  ELSE
   INSERT INTO public.event_whatsapp_groups(event_id,whatsapp_group_link)
    VALUES(NEW.id,trim(NEW.whatsapp_group_link))
    ON CONFLICT(event_id) DO UPDATE SET whatsapp_group_link=EXCLUDED.whatsapp_group_link,updated_at=now();
  END IF;
 END IF;
 NEW.whatsapp_group_link:=NULL;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS store_private_event_whatsapp_group ON public.events;
CREATE TRIGGER store_private_event_whatsapp_group BEFORE INSERT OR UPDATE OF whatsapp_group_link ON public.events
 FOR EACH ROW EXECUTE FUNCTION public.store_private_event_whatsapp_group();
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_whatsapp_link_private;
ALTER TABLE public.events ADD CONSTRAINT events_whatsapp_link_private CHECK(whatsapp_group_link IS NULL);
REVOKE ALL ON FUNCTION public.can_manage_event_whatsapp_group(text),public.can_read_event_whatsapp_group(text),public.store_private_event_whatsapp_group() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_event_whatsapp_group(text),public.can_read_event_whatsapp_group(text) TO authenticated,service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND
 NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_whatsapp_groups') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_whatsapp_groups;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
