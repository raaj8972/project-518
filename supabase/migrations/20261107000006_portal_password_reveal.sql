BEGIN;
CREATE TABLE IF NOT EXISTS public.portal_password_vault (
 portal text NOT NULL CHECK(portal IN ('council','cr','security')),
 identity text NOT NULL,ciphertext text NOT NULL,password_hash text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by text,
 PRIMARY KEY(portal,identity)
);
ALTER TABLE public.portal_password_vault ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_password_vault FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.portal_password_vault TO service_role;
CREATE OR REPLACE VIEW public.portal_password_current AS
 SELECT 'council'::text AS portal,id::text AS identity,council_password_hash AS password_hash FROM public.security_settings WHERE id=1
 UNION ALL SELECT 'cr',batch,password FROM public.batch_crs
 UNION ALL SELECT 'security',username,password_hash FROM public.security_users;
REVOKE ALL ON public.portal_password_current FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.portal_password_current TO service_role;
CREATE OR REPLACE FUNCTION public.save_portal_password_copy(p_portal text,p_identity text,p_password text,p_ciphertext text,p_actor text,p_full_name text DEFAULT NULL,p_create boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE new_hash text; saved_id text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_actor AND (role='owner' OR is_primary)) THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF p_password IS NULL OR (p_password !~ '^[0-9]{4,8}$' AND length(p_password)<8) OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use a 4-8 digit PIN or a password with at least 8 characters'; END IF;
 IF p_ciphertext IS NULL OR p_ciphertext NOT LIKE 'v1.%' OR length(p_ciphertext)<20 THEN RAISE EXCEPTION 'Encrypted password copy required'; END IF;
 IF nullif(trim(p_identity),'') IS NULL OR p_identity<>trim(p_identity) THEN RAISE EXCEPTION 'Choose an account'; END IF;
 new_hash:=extensions.crypt(p_password,extensions.gen_salt('bf'));
 IF p_portal='council' AND p_identity='1' THEN
  UPDATE public.security_settings SET council_password_hash=new_hash,council_passcode=NULL,updated_at=now() WHERE id=1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Council settings not configured'; END IF;
  saved_id:='1';
 ELSIF p_portal='cr' THEN
  INSERT INTO public.batch_crs(batch,password,updated_at) VALUES(p_identity,new_hash,now())
  ON CONFLICT(batch) DO UPDATE SET password=excluded.password,updated_at=excluded.updated_at;
  PERFORM public.revoke_portal_identity('cr_batch',p_identity);
  saved_id:=p_identity;
 ELSIF p_portal='security' THEN
  IF p_create THEN
   IF nullif(trim(p_full_name),'') IS NULL THEN RAISE EXCEPTION 'Full name required'; END IF;
   IF EXISTS(SELECT 1 FROM public.security_users WHERE lower(trim(full_name))=lower(trim(p_full_name))) THEN RAISE EXCEPTION 'A security account with this name already exists'; END IF;
   INSERT INTO public.security_users(username,password_hash,full_name,created_by) VALUES(p_identity,new_hash,trim(p_full_name),p_actor::uuid) RETURNING id::text INTO saved_id;
  ELSE
   UPDATE public.security_users SET password_hash=new_hash,updated_at=now() WHERE username=p_identity RETURNING id::text INTO saved_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Staff account not found'; END IF;
   PERFORM public.revoke_portal_identity('security_username',p_identity);
  END IF;
 ELSE RAISE EXCEPTION 'Choose a valid portal'; END IF;
 INSERT INTO public.portal_password_vault(portal,identity,ciphertext,password_hash,updated_by) VALUES(p_portal,p_identity,p_ciphertext,new_hash,p_actor)
 ON CONFLICT(portal,identity) DO UPDATE SET ciphertext=excluded.ciphertext,password_hash=excluded.password_hash,updated_at=now(),updated_by=excluded.updated_by;
 RETURN saved_id;
END $$;
REVOKE ALL ON FUNCTION public.save_portal_password_copy(text,text,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_portal_password_copy(text,text,text,text,text,text,boolean) TO service_role;
-- Retire copies when an older client changes or removes the corresponding password.
CREATE OR REPLACE FUNCTION public.invalidate_portal_password_copy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE portal_name text; account_key text;
BEGIN
 IF TG_TABLE_NAME='security_settings' THEN portal_name:='council';account_key:=OLD.id::text;
 ELSIF TG_TABLE_NAME='batch_crs' THEN portal_name:='cr';account_key:=OLD.batch;
 ELSE portal_name:='security';account_key:=OLD.username; END IF;
 DELETE FROM public.portal_password_vault WHERE portal=portal_name AND identity=account_key;
 RETURN NULL;
END $$;
CREATE TRIGGER council_password_copy_invalidated AFTER UPDATE OF council_password_hash OR DELETE ON public.security_settings FOR EACH ROW EXECUTE FUNCTION public.invalidate_portal_password_copy();
CREATE TRIGGER cr_password_copy_invalidated AFTER UPDATE OF password,batch OR DELETE ON public.batch_crs FOR EACH ROW EXECUTE FUNCTION public.invalidate_portal_password_copy();
CREATE TRIGGER security_password_copy_invalidated AFTER UPDATE OF password_hash,username OR DELETE ON public.security_users FOR EACH ROW EXECUTE FUNCTION public.invalidate_portal_password_copy();
REVOKE ALL ON FUNCTION public.invalidate_portal_password_copy() FROM PUBLIC,anon,authenticated;
COMMIT;
