-- Close legacy entry points and enforce private data access at the database boundary.
BEGIN;

-- SECURITY DEFINER privileges are explicit: only presentation/RLS helpers are public.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  IF f.proname=ANY(ARRAY['admin_can_manage_pages','admin_is_owner','current_admin_access','session_is_current','is_authorized_admin','is_admin','is_admin_or_owner','is_owner','can_edit_site_settings','check_is_group_member','check_is_group_owner','is_approved_for_event','get_public_event_winners','get_public_security_users','get_student_scoreboard','increment_daily_image_view']) THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon',f.signature);
  END IF;
  IF f.proname=ANY(ARRAY['register_for_event','process_pass_scan_v3','purge_all_logs','cleanup_auth_data','cleanup_expired_messages','cleanup_old_scans','cleanup_old_sessions','purge_old_chat_messages','get_security_dashboard_stats','login_coordinator','update_coordinator_registration_status','update_event_payment_gateway','create_vip_pass','create_vip_pass_v2','delete_entry_pass_v2','get_council_dashboard_stats','get_council_dashboard_stats_v2','get_council_dashboard_stats_v3','get_council_vip_passes','get_council_vip_passes_v2','get_council_vip_passes_v3','verify_council_password']) THEN
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated',f.signature);
  END IF;
 END LOOP;
END $$;

-- Defense in depth for existing browser admin RPCs: preserve signatures/business
-- logic, prepend session/page checks, and repair legacy text/UUID comparisons.
DO $$ DECLARE f record; guard text; body text; definition text; BEGIN
 FOR f IN SELECT p.oid,p.proname,p.prosrc,pg_get_functiondef(p.oid) def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(ARRAY['approve_pass_registration','delete_pass_registration','generate_pass_for_event_registration','delete_pass_scan_for_date','reset_pass_usage','update_pass_date','toggle_pass_council_visibility','delete_security_user','delete_event_category','reorder_event_categories','reset_registration_id_sequence','refresh_admin_stats','update_form_settings','cancel_registration']) LOOP
  guard:=CASE
   WHEN f.proname='delete_security_user' THEN 'public.admin_is_owner()'
   WHEN f.proname=ANY(ARRAY['delete_event_category','reorder_event_categories']) THEN $guard$public.admin_can_manage_pages(ARRAY['categories','events'],ARRAY['can_events'])$guard$
   WHEN f.proname='update_form_settings' THEN $guard$public.admin_can_manage_pages(ARRAY['auditions','memberships','homebound'],ARRAY[]::text[])$guard$
   WHEN f.proname='cancel_registration' THEN 'public.session_is_current()'
   WHEN f.proname=ANY(ARRAY['refresh_admin_stats','reset_registration_id_sequence']) THEN 'public.admin_is_owner()'
   ELSE $guard$public.admin_can_manage_pages(ARRAY['security-passes'],ARRAY['can_security_passes'])$guard$ END;
  -- The marker makes reruns idempotent. Service-only maintenance bypasses must
  -- never be inferred from current_user inside a SECURITY DEFINER function.
  IF position('prelaunch_authorization' IN f.prosrc)=0 THEN
   body:=regexp_replace(f.prosrc,'\mBEGIN\M','BEGIN /* prelaunch_authorization */ IF NOT coalesce(('||guard||'),false) THEN RAISE EXCEPTION ''Access denied'' USING ERRCODE=''42501''; END IF;','i');
   IF body=f.prosrc THEN RAISE EXCEPTION 'Cannot guard function %',f.proname;END IF;
   body:=replace(body,'user_id = auth.uid()','user_id::text = auth.uid()::text');
   definition:=replace(f.def,f.prosrc,body);
   EXECUTE definition;
   EXECUTE format('ALTER FUNCTION %s SET search_path=public,extensions,pg_temp',f.oid::regprocedure);
  END IF;
 END LOOP;
END $$;

-- Retain current admin and council-server callers, remove shared-password browser authorization.
CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(p_council_password text DEFAULT NULL,p_name text DEFAULT NULL,p_notes text DEFAULT NULL,p_valid_date date DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE pass_id uuid; token text; BEGIN
 IF NOT coalesce((public.admin_can_manage_pages(ARRAY['security-passes'],ARRAY['can_security_passes']) OR
  (auth.role()='service_role' AND public.verify_council_password(p_council_password))),false) THEN
  RAISE EXCEPTION 'Pass management access required' USING ERRCODE='42501';
 END IF;
 token:='VIP-'||upper(encode(extensions.gen_random_bytes(24),'hex'));
 INSERT INTO public.entry_passes(pass_token,pass_type,participant_name,notes,created_by,valid_date)
 VALUES(token,'vip',p_name,p_notes,auth.uid(),p_valid_date) RETURNING id INTO pass_id;
 RETURN json_build_object('success',true,'pass_id',pass_id,'pass_token',token);
END $fn$;
CREATE OR REPLACE FUNCTION public.delete_entry_pass_v3(p_council_password text DEFAULT NULL,p_pass_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
 IF NOT coalesce((public.admin_can_manage_pages(ARRAY['security-passes'],ARRAY['can_security_passes']) OR
  (auth.role()='service_role' AND public.verify_council_password(p_council_password))),false) THEN
  RAISE EXCEPTION 'Pass management access required' USING ERRCODE='42501';
 END IF;
 IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required';END IF;
 -- Council can only delete VIP passes, never a student's ordinary event pass.
 IF auth.role()='service_role' AND NOT EXISTS(SELECT 1 FROM public.entry_passes WHERE id=p_pass_id AND pass_type='vip') THEN RAISE EXCEPTION 'VIP pass not found';END IF;
 DELETE FROM public.pass_scans WHERE pass_id=p_pass_id;
 DELETE FROM public.entry_passes WHERE id=p_pass_id;
 RETURN json_build_object('success',true);
END $fn$;
CREATE OR REPLACE FUNCTION public.delete_entry_pass(p_pass_id uuid,p_council_password text DEFAULT NULL)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$ SELECT public.delete_entry_pass_v3(p_council_password,p_pass_id) $fn$;
REVOKE ALL ON FUNCTION public.create_vip_pass_v3(text,text,text,date),public.delete_entry_pass_v3(text,uuid),public.delete_entry_pass(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(text,text,text,date),public.delete_entry_pass_v3(text,uuid),public.delete_entry_pass(uuid,text) TO authenticated,service_role;

-- Keep public submission forms, but only assigned staff can read submitted contacts.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['auditions','memberships'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='SELECT' AND permissive='PERMISSIVE' LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  EXECUTE format('DROP POLICY IF EXISTS prelaunch_private_submission_read ON public.%I',t);
  EXECUTE format('CREATE POLICY prelaunch_private_submission_read ON public.%I AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(public.admin_can_manage_pages(ARRAY[%L],ARRAY[]::text[]))',t,t);
  EXECUTE format('CREATE POLICY prelaunch_staff_submission_read ON public.%I FOR SELECT TO authenticated USING(public.admin_can_manage_pages(ARRAY[%L],ARRAY[]::text[]))',t,t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.can_manage_storage_bucket(p_bucket text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
 SELECT public.admin_is_owner() OR CASE
 WHEN p_bucket=ANY(ARRAY['registration-photos']) THEN public.admin_can_manage_pages(ARRAY['registration-photos','reg-photos','registrations'],ARRAY['can_registration_photos','can_registrations'])
 WHEN p_bucket=ANY(ARRAY['event-images','events']) THEN public.admin_can_manage_pages(ARRAY['events'],ARRAY['can_events'])
 WHEN p_bucket=ANY(ARRAY['gallery','gallery-images']) THEN public.admin_can_manage_pages(ARRAY['gallery'],ARRAY['can_gallery'])
 WHEN p_bucket=ANY(ARRAY['sponsors','sponsor-logos','documents','pdf']) THEN public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors'])
 WHEN p_bucket=ANY(ARRAY['faculty-images','team-images','members']) THEN public.admin_can_manage_pages(ARRAY['rico-family'],ARRAY['can_core_team','can_faculty'])
 WHEN p_bucket=ANY(ARRAY['guest-artist-images','guest-artist-videos','guest-artist-audio','artists','band-images']) THEN public.admin_can_manage_pages(ARRAY['artist','guest-artists','band'],ARRAY['can_guest_artists','can_homebound'])
 WHEN p_bucket='sports-images' THEN public.admin_can_manage_pages(ARRAY['sports','sports-team'],ARRAY['can_sports'])
 WHEN p_bucket=ANY(ARRAY['hero-media','hero-video','hero-videos','hero_v2','fonts','public-content']) THEN public.admin_can_manage_pages(ARRAY['homepage','hero-media','site-settings'],ARRAY[]::text[])
 WHEN p_bucket='pdf-watermarks' THEN public.admin_can_manage_pages(ARRAY['registrations','events','auditions','memberships'],ARRAY['can_registrations','can_events'])
 ELSE false END
$fn$;
CREATE OR REPLACE FUNCTION public.can_write_storage_object(p_bucket text,p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
 SELECT public.session_is_current() AND (public.can_manage_storage_bucket(p_bucket) OR
  (p_bucket=ANY(ARRAY['avatars','registration-photos']) AND
    (split_part(p_name,'/',1)=auth.uid()::text OR (p_bucket='avatars' AND left(p_name,37)=auth.uid()::text||'-'))) OR
  (p_bucket='team-branding' AND EXISTS(SELECT 1 FROM public.student_groups g WHERE g.owner_id=auth.uid() AND split_part(p_name,'/',1)=g.id::text)))
$fn$;
CREATE OR REPLACE FUNCTION public.can_read_private_storage_object(p_bucket text,p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
 SELECT p_bucket<>ALL(ARRAY['registration-photos','chat-attachments']) OR
 (public.session_is_current() AND (public.can_manage_storage_bucket(p_bucket) OR
  (p_bucket='registration-photos' AND (split_part(p_name,'/',1)=auth.uid()::text OR EXISTS(
   SELECT 1 FROM public.registrations r WHERE public.coordinates_event(r.event_id::text)
   AND right(split_part(r.photo_url,'?',1),length(p_name)+21)='/registration-photos/'||p_name)))))
$fn$;
REVOKE ALL ON FUNCTION public.can_manage_storage_bucket(text),public.can_write_storage_object(text,text),public.can_read_private_storage_object(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_storage_bucket(text),public.can_write_storage_object(text,text),public.can_read_private_storage_object(text,text) TO anon,authenticated,service_role;

-- RESTRICTIVE policies close every old permissive grant, including unrecognized
-- legacy policies, without deleting storage objects or changing public media URLs.
DROP POLICY IF EXISTS prelaunch_storage_insert_guard ON storage.objects;
DROP POLICY IF EXISTS prelaunch_storage_update_guard ON storage.objects;
DROP POLICY IF EXISTS prelaunch_storage_delete_guard ON storage.objects;
DROP POLICY IF EXISTS prelaunch_storage_read_guard ON storage.objects;
DROP POLICY IF EXISTS prelaunch_storage_owner_access ON storage.objects;
CREATE POLICY prelaunch_storage_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(public.can_write_storage_object(bucket_id,name));
CREATE POLICY prelaunch_storage_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(public.can_write_storage_object(bucket_id,name)) WITH CHECK(public.can_write_storage_object(bucket_id,name));
CREATE POLICY prelaunch_storage_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(public.can_write_storage_object(bucket_id,name));
CREATE POLICY prelaunch_storage_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(public.can_read_private_storage_object(bucket_id,name));
CREATE POLICY prelaunch_storage_owner_access ON storage.objects FOR ALL TO authenticated USING(public.can_write_storage_object(bucket_id,name)) WITH CHECK(public.can_write_storage_object(bucket_id,name));

UPDATE storage.buckets SET public=false WHERE id IN('registration-photos','chat-attachments');
-- Explicit allowlists exclude executable/HTML/SVG uploads. Existing public SVG
-- watermarks remain readable; new ones are rasterized by the client before upload.
UPDATE storage.buckets SET file_size_limit=coalesce(file_size_limit,20*1024*1024),allowed_mime_types=ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/webm','video/quicktime']
WHERE id NOT IN('fonts','documents','pdf','chat-attachments','pdf-watermarks','guest-artist-audio','guest-artist-videos','hero-video','hero-videos','registration-photos','avatars','team-branding');
UPDATE storage.buckets SET file_size_limit=5*1024*1024,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'] WHERE id IN('avatars','team-branding','pdf-watermarks');
UPDATE storage.buckets SET file_size_limit=10*1024*1024,allowed_mime_types=ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/avif','application/pdf'] WHERE id IN('registration-photos','chat-attachments');
UPDATE storage.buckets SET file_size_limit=10*1024*1024,allowed_mime_types=ARRAY['font/woff','font/woff2','font/ttf','font/otf','application/font-woff','application/x-font-ttf','application/x-font-opentype','application/vnd.ms-fontobject'] WHERE id='fonts';
UPDATE storage.buckets SET file_size_limit=coalesce(file_size_limit,100*1024*1024),allowed_mime_types=ARRAY['application/pdf','image/png','image/jpeg','image/webp'] WHERE id IN('documents','pdf');
UPDATE storage.buckets SET file_size_limit=coalesce(file_size_limit,25*1024*1024),allowed_mime_types=ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4'] WHERE id='guest-artist-audio';

-- Neutralize any committed default, without replacing it with another known secret.
-- Owner can provision a new council credential from the existing Access Center.
UPDATE public.security_settings SET council_password_hash=NULL,council_passcode=NULL,updated_at=now()
WHERE council_passcode IS NOT NULL AND council_password_hash=extensions.crypt(council_passcode,council_password_hash);
COMMIT;
