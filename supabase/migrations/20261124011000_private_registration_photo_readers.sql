-- Freeze existing photo associations, then bind new files only from their real
-- uploader or trusted staff. Mutable photo_url fields must not grant access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.registration_photo_access(
 domain text NOT NULL,registration_id text NOT NULL,object_name text NOT NULL,
 user_id uuid,event_id text,PRIMARY KEY(domain,registration_id)
);
ALTER TABLE public.registration_photo_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_photo_access FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.registration_photo_access TO service_role;
DO $bootstrap$ BEGIN
 IF obj_description('public.registration_photo_access'::regclass,'pg_class') IS DISTINCT FROM 'Private registration photo associations initialized' THEN
  INSERT INTO public.registration_photo_access(domain,registration_id,object_name,user_id,event_id)
  SELECT source.domain,source.id,o.name,source.user_id,source.event_id
  FROM (
   SELECT 'event'::text domain,id::text,user_id,event_id::text,photo_url FROM public.registrations
   UNION ALL SELECT 'sports',id::text,user_id,NULL,coalesce(to_jsonb(r)->>'photo_url',to_jsonb(r)->'metadata'->>'photo_url') FROM public.sports_registrations r
   UNION ALL SELECT 'annual',id::text,user_id,NULL,coalesce(to_jsonb(r)->>'photo_url',to_jsonb(r)->'metadata'->>'photo_url') FROM public.annual_sports_registrations r
  ) source JOIN storage.objects o ON o.bucket_id='registration-photos'
   AND o.name=substring(split_part(source.photo_url,'?',1) FROM '/storage/v1/object/(?:public|authenticated)/registration-photos/(.+)$')
  ON CONFLICT(domain,registration_id) DO NOTHING;
  COMMENT ON TABLE public.registration_photo_access IS 'Private registration photo associations initialized';
 END IF;
END $bootstrap$;
CREATE OR REPLACE FUNCTION public.bind_registration_photo_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE current_row jsonb;old_row jsonb;domain_name text;photo text;file_name text;student uuid;
BEGIN
 domain_name:=CASE TG_TABLE_NAME WHEN 'registrations' THEN 'event' WHEN 'sports_registrations' THEN 'sports' ELSE 'annual' END;
 IF TG_OP='DELETE' THEN DELETE FROM public.registration_photo_access WHERE domain=domain_name AND registration_id=OLD.id::text;RETURN NULL;END IF;
 current_row:=to_jsonb(NEW);photo:=coalesce(current_row->>'photo_url',current_row->'metadata'->>'photo_url');student:=(current_row->>'user_id')::uuid;
 IF TG_OP='UPDATE' THEN
  old_row:=to_jsonb(OLD);
  IF photo IS NOT DISTINCT FROM coalesce(old_row->>'photo_url',old_row->'metadata'->>'photo_url') AND student IS NOT DISTINCT FROM (old_row->>'user_id')::uuid AND current_row->>'event_id' IS NOT DISTINCT FROM old_row->>'event_id' THEN RETURN NULL;END IF;
 END IF;
 DELETE FROM public.registration_photo_access WHERE domain=domain_name AND registration_id=NEW.id::text;
 file_name:=substring(split_part(photo,'?',1) FROM '/storage/v1/object/(?:public|authenticated)/registration-photos/(.+)$');
 IF file_name IS NOT NULL AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='registration-photos' AND name=file_name) AND
  (auth.role()='service_role' OR public.can_manage_storage_bucket('registration-photos') OR
   (public.session_is_current() AND auth.uid()=student AND split_part(file_name,'/',1)=student::text)) THEN
  INSERT INTO public.registration_photo_access(domain,registration_id,object_name,user_id,event_id)
  VALUES(domain_name,NEW.id::text,file_name,student,current_row->>'event_id') ON CONFLICT(domain,registration_id) DO UPDATE SET object_name=excluded.object_name,user_id=excluded.user_id,event_id=excluded.event_id;
 END IF;
 RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION public.bind_registration_photo_access() FROM PUBLIC,anon,authenticated;
DO $triggers$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['registrations','sports_registrations','annual_sports_registrations'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS private_photo_access_binding ON public.%I',t);
  EXECUTE format('CREATE TRIGGER private_photo_access_binding AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bind_registration_photo_access()',t);
 END LOOP;
END $triggers$;
CREATE OR REPLACE FUNCTION public.can_read_private_storage_object(p_bucket text,p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
 SELECT p_bucket<>ALL(ARRAY['registration-photos','chat-attachments']) OR
 (public.session_is_current() AND (public.can_manage_storage_bucket(p_bucket) OR
  (p_bucket='registration-photos' AND (split_part(p_name,'/',1)=auth.uid()::text OR EXISTS(
   SELECT 1 FROM public.registration_photo_access a WHERE a.object_name=p_name AND
    (a.user_id=auth.uid() OR (a.domain='event' AND public.coordinates_event(a.event_id)) OR
     (a.domain='sports' AND public.admin_can_manage_pages(ARRAY['sports-registrations'],ARRAY['can_sports'])) OR
     (a.domain='annual' AND public.admin_can_manage_pages(ARRAY['annual-registrations'],ARRAY['can_sports']))))))))
$fn$;
COMMIT;
