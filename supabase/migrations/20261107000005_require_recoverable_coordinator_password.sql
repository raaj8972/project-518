BEGIN;
-- Stop legacy event writes from silently replacing recoverable passwords with hashes only.
CREATE OR REPLACE FUNCTION public.store_coordinator_password() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF nullif(NEW.coordinator_password,'') IS NOT NULL THEN
  RAISE EXCEPTION 'Save coordinator passwords from Passwords & Access so the owner-readable copy is preserved';
 END IF;
 NEW.coordinator_password:=NULL;
 RETURN NEW;
END $$;
-- The login hash and encrypted owner-readable copy are committed together.
CREATE OR REPLACE FUNCTION public.save_coordinator_password_copy(p_event_id text,p_password text,p_ciphertext text,p_actor text,p_grouping boolean DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_hash text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_actor AND (role='owner' OR is_primary)) THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF p_password IS NULL OR length(p_password)<8 OR octet_length(p_password)>72 OR p_password<>trim(p_password) THEN RAISE EXCEPTION 'Use at least 8 characters without leading or trailing spaces'; END IF;
 IF p_ciphertext IS NULL OR p_ciphertext NOT LIKE 'v1.%' OR length(p_ciphertext)<20 THEN RAISE EXCEPTION 'Encrypted password copy is required'; END IF;
 PERFORM 1 FROM public.events WHERE id::text=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
 current_hash:=extensions.crypt(p_password,extensions.gen_salt('bf'));
 INSERT INTO public.coordinator_credentials(event_id,password_hash) VALUES(p_event_id,current_hash)
 ON CONFLICT(event_id) DO UPDATE SET password_hash=excluded.password_hash;
 INSERT INTO public.coordinator_password_vault(event_id,ciphertext,password_hash,updated_by)
 VALUES(p_event_id,p_ciphertext,current_hash,p_actor)
 ON CONFLICT(event_id) DO UPDATE SET ciphertext=excluded.ciphertext,password_hash=excluded.password_hash,updated_at=now(),updated_by=excluded.updated_by;
 IF p_grouping IS NOT NULL THEN UPDATE public.events SET special_grouping_enabled=p_grouping WHERE id::text=p_event_id; END IF;
 PERFORM public.revoke_portal_identity('coordinator_event_id',p_event_id);
END $$;
-- Check at transaction end so neither half of a password save can be lost.
-- Untouched legacy hash-only entries are retained; new changes must be recoverable.
CREATE OR REPLACE FUNCTION public.require_coordinator_password_copy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE changed_event text;
BEGIN
 changed_event:=CASE WHEN TG_OP='DELETE' THEN OLD.event_id ELSE NEW.event_id END;
 IF EXISTS(SELECT 1 FROM public.coordinator_credentials WHERE event_id=changed_event)
 AND NOT EXISTS(SELECT 1 FROM public.coordinator_credentials c JOIN public.coordinator_password_vault v USING(event_id)
   WHERE c.event_id=changed_event AND c.password_hash=v.password_hash AND nullif(v.ciphertext,'') IS NOT NULL) THEN
  RAISE EXCEPTION 'Coordinator password changes require a matching encrypted owner-readable copy';
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS coordinator_login_requires_copy ON public.coordinator_credentials;
CREATE CONSTRAINT TRIGGER coordinator_login_requires_copy AFTER INSERT OR UPDATE ON public.coordinator_credentials
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.require_coordinator_password_copy();
DROP TRIGGER IF EXISTS coordinator_copy_required ON public.coordinator_password_vault;
CREATE CONSTRAINT TRIGGER coordinator_copy_required AFTER INSERT OR UPDATE OR DELETE ON public.coordinator_password_vault
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.require_coordinator_password_copy();
REVOKE ALL ON FUNCTION public.require_coordinator_password_copy() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_coordinator_password_copy(text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_coordinator_password_copy(text,text,text,text,boolean) TO service_role;
COMMIT;
