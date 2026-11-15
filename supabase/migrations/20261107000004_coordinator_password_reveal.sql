BEGIN;
-- Recoverable copies of shared coordinator credentials, encrypted by the server.
-- Login passwords remain in the existing hash-only coordinator_credentials table.
CREATE TABLE IF NOT EXISTS public.coordinator_password_vault (
 event_id text PRIMARY KEY,
 ciphertext text NOT NULL,
 password_hash text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text
);
ALTER TABLE public.coordinator_password_vault ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coordinator_password_vault FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.coordinator_password_vault TO service_role;
-- Older clients must invalidate a saved copy whenever they rotate the hash.
CREATE OR REPLACE FUNCTION public.store_coordinator_password() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF nullif(NEW.coordinator_password,'') IS NOT NULL THEN
  IF auth.uid() IS NOT NULL AND NOT public.admin_is_owner() THEN RAISE EXCEPTION 'Owner access required to change coordinator passwords'; END IF;
  IF length(NEW.coordinator_password)<8 OR octet_length(NEW.coordinator_password)>72 OR NEW.coordinator_password<>trim(NEW.coordinator_password) THEN RAISE EXCEPTION 'Use at least 8 characters without leading or trailing spaces'; END IF;
  INSERT INTO public.coordinator_credentials(event_id,password_hash)
   VALUES(NEW.id::text,extensions.crypt(NEW.coordinator_password,extensions.gen_salt('bf')))
   ON CONFLICT(event_id) DO UPDATE SET password_hash=excluded.password_hash;
  DELETE FROM public.coordinator_password_vault WHERE event_id=NEW.id::text;
  PERFORM public.revoke_portal_identity('coordinator_event_id',NEW.id::text);
 END IF;
 NEW.coordinator_password:=NULL;
 RETURN NEW;
END $$;
-- Only the owner-authorized server endpoint can call this atomic save.
CREATE OR REPLACE FUNCTION public.save_coordinator_password_copy(p_event_id text,p_password text,p_ciphertext text,p_actor text,p_grouping boolean DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_hash text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_actor AND (role='owner' OR is_primary)) THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF p_password IS NULL OR length(p_password)<8 OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use at least 8 characters without leading or trailing spaces'; END IF;
 IF p_ciphertext IS NULL OR p_ciphertext NOT LIKE 'v1.%' THEN RAISE EXCEPTION 'Encrypted password copy is required'; END IF;
 UPDATE public.events SET coordinator_password=p_password,special_grouping_enabled=coalesce(p_grouping,special_grouping_enabled) WHERE id::text=p_event_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
 SELECT password_hash INTO current_hash FROM public.coordinator_credentials WHERE event_id=p_event_id;
 INSERT INTO public.coordinator_password_vault(event_id,ciphertext,password_hash,updated_by)
 VALUES(p_event_id,p_ciphertext,current_hash,p_actor)
 ON CONFLICT(event_id) DO UPDATE SET ciphertext=excluded.ciphertext,password_hash=excluded.password_hash,updated_at=now(),updated_by=excluded.updated_by;
END $$;
REVOKE ALL ON FUNCTION public.save_coordinator_password_copy(text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_coordinator_password_copy(text,text,text,text,boolean) TO service_role;
COMMIT;
