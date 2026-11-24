-- Artist profiles and uploads share one page permission. No existing media is removed.
BEGIN;
ALTER TABLE public.guest_artists ENABLE ROW LEVEL SECURITY;
-- Public SELECT policies evaluate this boolean helper for the current caller.
GRANT EXECUTE ON FUNCTION public.admin_can_manage_pages(text[],text[]) TO anon;
DROP POLICY IF EXISTS artist_published_read_guard ON public.guest_artists;
CREATE POLICY artist_published_read_guard ON public.guest_artists AS RESTRICTIVE
 FOR SELECT TO anon,authenticated
 USING (enabled OR public.admin_can_manage_pages(ARRAY['guest-artists'],ARRAY['can_guest_artists']));

DO $artist$ DECLARE operation text; BEGIN
 FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.guest_artists','artist_scope_'||lower(operation));
  EXECUTE format('CREATE POLICY %I ON public.guest_artists AS RESTRICTIVE FOR %s TO anon,authenticated %s',
   'artist_scope_'||lower(operation),operation,
   CASE operation
    WHEN 'INSERT' THEN $$WITH CHECK(public.admin_can_manage_pages(ARRAY['guest-artists'],ARRAY['can_guest_artists']))$$
    WHEN 'UPDATE' THEN $$USING(public.admin_can_manage_pages(ARRAY['guest-artists'],ARRAY['can_guest_artists'])) WITH CHECK(public.admin_can_manage_pages(ARRAY['guest-artists'],ARRAY['can_guest_artists']))$$
    ELSE $$USING(public.admin_can_manage_pages(ARRAY['guest-artists'],ARRAY['can_guest_artists']))$$ END);
 END LOOP;
END $artist$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('guest-artist-images','guest-artist-images',true,52428800,ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']),
 ('guest-artist-videos','guest-artist-videos',true,52428800,ARRAY['video/mp4','video/webm','video/quicktime']),
 ('guest-artist-audio','guest-artist-audio',true,26214400,ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4'])
ON CONFLICT(id) DO UPDATE SET public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Additional restrictive policies neutralize broad legacy upload grants only for
-- the three artist buckets, without changing another section's storage scope.
DO $policy$ DECLARE operation text; guard text; BEGIN
 guard:=$guard$(bucket_id NOT IN('guest-artist-images','guest-artist-videos','guest-artist-audio') OR public.admin_can_manage_pages(ARRAY['guest-artists'],ARRAY['can_guest_artists']))$guard$;
 FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','artist_bucket_'||lower(operation));
  EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR %s TO anon,authenticated %s',
   'artist_bucket_'||lower(operation),operation,
   CASE operation WHEN 'INSERT' THEN 'WITH CHECK('||guard||')'
    WHEN 'UPDATE' THEN 'USING('||guard||') WITH CHECK('||guard||')'
    ELSE 'USING('||guard||')' END);
 END LOOP;
END $policy$;

-- Artist staff may edit stage display settings without getting general homepage
-- write access. This RPC cannot change any other homepage column.
CREATE OR REPLACE FUNCTION public.save_artist_stage_settings(p_settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
BEGIN
 IF NOT coalesce(public.admin_can_manage_pages(ARRAY['guest-artists','homepage'],ARRAY['can_guest_artists']),false) THEN
  RAISE EXCEPTION 'Artist or homepage management access required' USING ERRCODE='42501';
 END IF;
 IF NOT public.valid_artist_stage_settings(p_settings) OR
    (p_settings-ARRAY['visible_years','date_label','venue_label','lights_enabled','beat_sync'])<>'{}'::jsonb THEN
  RAISE EXCEPTION 'Invalid artist stage settings' USING ERRCODE='22023';
 END IF;
 UPDATE public.homepage_settings SET artist_stage_settings=p_settings,updated_at=now() WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Homepage settings row is missing' USING ERRCODE='P0002';END IF;
 RETURN p_settings;
END $function$;
REVOKE ALL ON FUNCTION public.save_artist_stage_settings(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_artist_stage_settings(jsonb) TO authenticated,service_role;

-- A row that becomes hidden no longer passes a public Realtime SELECT check.
-- Touch only the existing public settings timestamp so public clients can refetch
-- their filtered lineup without receiving any hidden artist data.
CREATE OR REPLACE FUNCTION public.notify_artist_lineup_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
BEGIN
 UPDATE public.homepage_settings SET updated_at=clock_timestamp() WHERE id=1;
 RETURN NULL;
END $function$;
REVOKE ALL ON FUNCTION public.notify_artist_lineup_changed() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS artist_lineup_changed ON public.guest_artists;
CREATE TRIGGER artist_lineup_changed AFTER INSERT OR UPDATE OR DELETE ON public.guest_artists
 FOR EACH ROW EXECUTE FUNCTION public.notify_artist_lineup_changed();
DO $publication$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND
    NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='homepage_settings') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_settings;
 END IF;
END $publication$;
NOTIFY pgrst,'reload schema';
COMMIT;
