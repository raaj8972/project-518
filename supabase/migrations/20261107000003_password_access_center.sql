BEGIN;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS totp_secret text;
-- All portal credential mutations require an active owner membership.
CREATE OR REPLACE FUNCTION public.set_council_password(p_password text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF p_password IS NULL OR length(p_password)<8 OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use at least 8 characters; avoid leading/trailing spaces and overly long passwords'; END IF;
 UPDATE public.security_settings SET council_password_hash=extensions.crypt(p_password,extensions.gen_salt('bf')),council_passcode=NULL,updated_at=now() WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Council settings are not configured'; END IF;
 RETURN json_build_object('success',true);
END $$;
CREATE OR REPLACE FUNCTION public.verify_council_password(p_password text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.security_settings WHERE id=1 AND council_password_hash=extensions.crypt(p_password,council_password_hash));
$$;
-- Revocation applies to existing JWTs as well as refresh tokens.
CREATE OR REPLACE FUNCTION public.revoke_portal_identity(p_key text,p_value text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE identity_id uuid;
BEGIN
 FOR identity_id IN SELECT id FROM auth.users WHERE raw_app_meta_data->>p_key=p_value LOOP
  PERFORM public.revoke_user_sessions(identity_id);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.revoke_portal_identity(text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.set_cr_password(p_batch text,p_password text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF nullif(trim(p_batch),'') IS NULL THEN RAISE EXCEPTION 'Choose a batch'; END IF;
 IF p_password IS NULL OR length(p_password)<8 OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use at least 8 characters; avoid leading/trailing spaces and overly long passwords'; END IF;
 INSERT INTO public.batch_crs(batch,password,updated_at) VALUES(trim(p_batch),extensions.crypt(p_password,extensions.gen_salt('bf')),now())
 ON CONFLICT(batch) DO UPDATE SET password=excluded.password,updated_at=excluded.updated_at;
 PERFORM public.revoke_portal_identity('cr_batch',trim(p_batch));
END $$;
CREATE OR REPLACE FUNCTION public.verify_cr_login(p_batch text,p_password text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.batch_crs WHERE batch=p_batch AND
  CASE WHEN password LIKE '$2%' THEN password=extensions.crypt(p_password,password) ELSE password=p_password END);
$$;
CREATE OR REPLACE FUNCTION public.remove_cr_access(p_batch text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 DELETE FROM public.batch_crs WHERE batch=p_batch;
 PERFORM public.revoke_portal_identity('cr_batch',p_batch);
END $$;
CREATE OR REPLACE FUNCTION public.create_security_user(p_username text,p_password text,p_full_name text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE new_id bigint;
BEGIN
 IF NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF nullif(trim(p_username),'') IS NULL OR nullif(trim(p_full_name),'') IS NULL THEN RAISE EXCEPTION 'Name and username are required'; END IF;
 IF p_password IS NULL OR length(p_password)<8 OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use at least 8 characters; avoid leading/trailing spaces and overly long passwords'; END IF;
 INSERT INTO public.security_users(username,password_hash,full_name,created_by)
 VALUES(trim(p_username),extensions.crypt(p_password,extensions.gen_salt('bf')),trim(p_full_name),auth.uid()) RETURNING id INTO new_id;
 RETURN json_build_object('success',true,'id',new_id,'username',trim(p_username));
END $$;
CREATE OR REPLACE FUNCTION public.set_security_user_password(p_user_id bigint,p_password text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE staff_username text;
BEGIN
 IF NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF p_password IS NULL OR length(p_password)<8 OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use at least 8 characters; avoid leading/trailing spaces and overly long passwords'; END IF;
 UPDATE public.security_users SET password_hash=extensions.crypt(p_password,extensions.gen_salt('bf')),updated_at=now() WHERE id=p_user_id RETURNING username INTO staff_username;
 IF NOT FOUND THEN RAISE EXCEPTION 'Staff account not found'; END IF;
 PERFORM public.revoke_portal_identity('security_username',staff_username);
END $$;
CREATE OR REPLACE FUNCTION public.manage_security_user_access(p_user_id bigint,p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE staff_username text;
BEGIN
 IF NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF p_action NOT IN ('enable','disable') THEN RAISE EXCEPTION 'Choose a valid account action'; END IF;
 UPDATE public.security_users SET is_active=(p_action='enable'),updated_at=now() WHERE id=p_user_id RETURNING username INTO staff_username;
 IF NOT FOUND THEN RAISE EXCEPTION 'Staff account not found'; END IF;
 IF p_action='disable' THEN PERFORM public.revoke_portal_identity('security_username',staff_username); END IF;
END $$;
CREATE OR REPLACE FUNCTION public.authenticate_security_user(p_username text,p_password text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE staff public.security_users;
BEGIN
 SELECT * INTO staff FROM public.security_users WHERE username=p_username AND is_active;
 IF FOUND AND staff.password_hash=extensions.crypt(p_password,staff.password_hash) THEN
  PERFORM public.log_login_attempt('security',p_username,'success');
  RETURN json_build_object('success',true,'user',json_build_object('id',staff.id,'username',staff.username,'full_name',staff.full_name));
 END IF;
 PERFORM public.log_login_attempt('security',p_username,'failure');
 RETURN json_build_object('success',false,'message','Invalid username or password');
END $$;
REVOKE ALL ON FUNCTION public.set_council_password(text),public.set_cr_password(text,text),public.remove_cr_access(text),public.create_security_user(text,text,text),public.set_security_user_password(bigint,text),public.manage_security_user_access(bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_council_password(text),public.set_cr_password(text,text),public.remove_cr_access(text),public.create_security_user(text,text,text),public.set_security_user_password(bigint,text),public.manage_security_user_access(bigint,text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.verify_council_password(text),public.verify_cr_login(text,text),public.authenticate_security_user(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_council_password(text),public.verify_cr_login(text,text),public.authenticate_security_user(text,text) TO service_role;
-- Store coordinator credentials privately; older event records may still contain plaintext.
DROP TRIGGER IF EXISTS revoke_coordinator_password_sessions ON public.events;
DROP FUNCTION IF EXISTS public.coordinator_password_changed();
CREATE TABLE IF NOT EXISTS public.coordinator_credentials(event_id text PRIMARY KEY,password_hash text NOT NULL);
ALTER TABLE public.coordinator_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coordinator_credentials FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.coordinator_credentials TO service_role;
INSERT INTO public.coordinator_credentials(event_id,password_hash)
 SELECT id::text,extensions.crypt(trim(coordinator_password),extensions.gen_salt('bf')) FROM public.events
 WHERE nullif(trim(coordinator_password),'') IS NOT NULL
 ON CONFLICT(event_id) DO UPDATE SET password_hash=excluded.password_hash;
UPDATE public.events SET coordinator_password=NULL WHERE coordinator_password IS NOT NULL;
CREATE OR REPLACE FUNCTION public.store_coordinator_password() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF nullif(NEW.coordinator_password,'') IS NOT NULL THEN
  IF auth.uid() IS NOT NULL AND NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required to change coordinator passwords'; END IF;
  IF length(NEW.coordinator_password)<8 OR octet_length(NEW.coordinator_password)>72 OR NEW.coordinator_password<>trim(NEW.coordinator_password) THEN RAISE EXCEPTION 'Use at least 8 characters without leading or trailing spaces'; END IF;
  INSERT INTO public.coordinator_credentials(event_id,password_hash)
   VALUES(NEW.id::text,extensions.crypt(NEW.coordinator_password,extensions.gen_salt('bf')))
   ON CONFLICT(event_id) DO UPDATE SET password_hash=excluded.password_hash;
  PERFORM public.revoke_portal_identity('coordinator_event_id',NEW.id::text);
 END IF;
 NEW.coordinator_password:=NULL;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS store_coordinator_password ON public.events;
CREATE TRIGGER store_coordinator_password BEFORE INSERT OR UPDATE OF coordinator_password ON public.events
 FOR EACH ROW EXECUTE FUNCTION public.store_coordinator_password();
CREATE OR REPLACE FUNCTION public.verify_coordinator_password_secure(p_event_id text,p_password text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.coordinator_credentials c JOIN public.events e ON e.id::text=c.event_id
  WHERE c.event_id=p_event_id AND e.visible IS DISTINCT FROM false AND c.password_hash=extensions.crypt(p_password,c.password_hash));
$$;
REVOKE ALL ON FUNCTION public.store_coordinator_password(),public.verify_coordinator_password_secure(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_coordinator_password_secure(text,text) TO service_role;
-- Existing Council reports used unqualified pgcrypto calls with an empty search path.
DO $$ DECLARE report record; definition text; BEGIN
 FOR report IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'get_council%' LOOP
  SELECT pg_get_functiondef(report.oid) INTO definition;
  definition:=regexp_replace(definition,'(^|[^[:alnum:]_.])crypt\(',E'\\1extensions.crypt(','g');
  EXECUTE definition;
 END LOOP;
END $$;
-- Prevent older clients from bypassing owner-only credential controls through table writes.
DO $$ DECLARE table_name text; operation text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['security_users','batch_crs'] LOOP
  FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
   EXECUTE format('DROP POLICY IF EXISTS credential_owner_%s ON public.%I',lower(operation),table_name);
   EXECUTE format('CREATE POLICY credential_owner_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',lower(operation),table_name,operation,
    CASE operation WHEN 'INSERT' THEN 'WITH CHECK(public.admin_is_owner())' WHEN 'DELETE' THEN 'USING(public.admin_is_owner())' ELSE 'USING(public.admin_is_owner()) WITH CHECK(public.admin_is_owner())' END);
  END LOOP;
 END LOOP;
END $$;
COMMIT;
