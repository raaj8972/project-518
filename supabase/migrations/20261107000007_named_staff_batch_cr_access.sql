BEGIN;
-- A staff name is enough for the login form; internal usernames retain stable identities.
CREATE OR REPLACE FUNCTION public.authenticate_security_user(p_username text,p_password text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE staff public.security_users; matches integer;
BEGIN
 SELECT * INTO staff FROM public.security_users WHERE username=trim(p_username) AND is_active;
 IF NOT FOUND THEN
  SELECT count(*) INTO matches FROM public.security_users WHERE lower(trim(full_name))=lower(trim(p_username)) AND is_active;
  IF matches<>1 THEN RETURN json_build_object('success',false,'message','Invalid name or PIN/password'); END IF;
  SELECT * INTO staff FROM public.security_users WHERE lower(trim(full_name))=lower(trim(p_username)) AND is_active;
 END IF;
 IF staff.password_hash=extensions.crypt(p_password,staff.password_hash) THEN
  PERFORM public.log_login_attempt('security',staff.username,'success');
  RETURN json_build_object('success',true,'user',json_build_object('id',staff.id,'username',staff.username,'full_name',staff.full_name));
 END IF;
 PERFORM public.log_login_attempt('security',trim(p_username),'failure');
 RETURN json_build_object('success',false,'message','Invalid name or PIN/password');
END $$;
REVOKE ALL ON FUNCTION public.authenticate_security_user(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_security_user(text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.cr_can_manage_batch(p_batch text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.session_is_current()
 AND auth.jwt()->'app_metadata'->>'role'='cr'
 AND auth.jwt()->'app_metadata'->>'cr_batch'=p_batch
 AND EXISTS(SELECT 1 FROM public.batch_crs WHERE batch=p_batch),false);
$$;
REVOKE ALL ON FUNCTION public.cr_can_manage_batch(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cr_can_manage_batch(text) TO authenticated,service_role;
-- Restrictive policy also applies when a general public-profile policy allows reads.
DROP POLICY IF EXISTS cr_profiles_batch_boundary ON public.profiles;
CREATE POLICY cr_profiles_batch_boundary ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
 USING(coalesce(auth.jwt()->'app_metadata'->>'role','')<>'cr' OR public.cr_can_manage_batch(batch));
CREATE OR REPLACE FUNCTION public.approve_student_profile(p_student_id uuid,p_batch text,p_password text,p_is_approved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_student_id FOR UPDATE;
 IF NOT public.is_authorized_admin() AND NOT (public.cr_can_manage_batch(p_batch) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=p_student_id AND batch=p_batch)) THEN
  RAISE EXCEPTION 'Invalid CR credentials or student is outside your batch';
 END IF;
 PERFORM set_config('app.settings.trusted_cr_action','true',true);
 UPDATE public.profiles SET is_approved=p_is_approved WHERE id=p_student_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.cr_approve_batch_profiles(p_student_ids uuid[],p_is_approved boolean DEFAULT true)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_batch text; changed integer;
BEGIN
 own_batch:=auth.jwt()->'app_metadata'->>'cr_batch';
 IF NOT coalesce(public.cr_can_manage_batch(own_batch),false) THEN RAISE EXCEPTION 'Valid CR session required'; END IF;
 IF p_student_ids IS NULL OR cardinality(p_student_ids)=0 THEN RETURN 0; END IF;
 -- Lock every selected profile so batch changes cannot race the authorization check.
 PERFORM 1 FROM public.profiles WHERE id=ANY(p_student_ids) FOR UPDATE;
 IF EXISTS(SELECT 1 FROM unnest(p_student_ids) AS ids(id) LEFT JOIN public.profiles p ON p.id=ids.id WHERE p.id IS NULL OR p.batch IS DISTINCT FROM own_batch) THEN
  RAISE EXCEPTION 'Student is outside your batch';
 END IF;
 PERFORM set_config('app.settings.trusted_cr_action','true',true);
 UPDATE public.profiles SET is_approved=p_is_approved WHERE id=ANY(p_student_ids) AND batch=own_batch;
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed;
END $$;
REVOKE ALL ON FUNCTION public.approve_student_profile(uuid,text,text,boolean),public.cr_approve_batch_profiles(uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_student_profile(uuid,text,text,boolean),public.cr_approve_batch_profiles(uuid[],boolean) TO authenticated,service_role;
COMMIT;
