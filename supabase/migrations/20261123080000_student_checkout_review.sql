-- Student checkout always creates entries awaiting staff review. No team auto-approval.
BEGIN;
CREATE OR REPLACE FUNCTION public.student_registration_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.session_is_current() AND EXISTS(
  SELECT 1 FROM public.profiles p JOIN public.student_iqmg_identities i ON i.user_id=p.id
  WHERE p.id=auth.uid() AND p.is_approved IS TRUE AND nullif(trim(p.full_name),'') IS NOT NULL
  AND nullif(trim(p.batch),'') IS NOT NULL AND p.phone ~ '^\+?[0-9 ().-]+$'
  AND length(regexp_replace(p.phone,'[^0-9]','','g')) BETWEEN 10 AND 15
  AND i.iqmg_number IS NOT NULL AND i.status IN('pending','verified'))
$$;
CREATE OR REPLACE FUNCTION public.register_cart_event(p_event_id text,p_user_ids uuid[],p_team_name text,p_participant_details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e public.events;participant uuid;profile_record public.profiles;is_team boolean:=p_team_name IS NOT NULL;members integer:=coalesce(cardinality(p_user_ids),0);
BEGIN
 IF NOT public.session_is_current() OR NOT public.student_registration_ready() THEN RAISE EXCEPTION 'Complete your student profile and IQMG number and wait for account approval before registering';END IF;
 IF members<1 OR members>100 OR array_position(p_user_ids,NULL) IS NOT NULL OR NOT auth.uid()=ANY(p_user_ids) OR members<>(SELECT count(DISTINCT id) FROM unnest(p_user_ids) id) THEN RAISE EXCEPTION 'Invalid participant list';END IF;
 IF EXISTS(SELECT 1 FROM public.security_settings s WHERE coalesce((to_jsonb(s)->>'panic_mode')::boolean,false) OR coalesce((to_jsonb(s)->>'panic_mode_enabled')::boolean,false)) THEN RAISE EXCEPTION 'Registrations are temporarily paused';END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_user_ids) requested(user_id) LEFT JOIN public.profiles p ON p.id=requested.user_id LEFT JOIN public.student_iqmg_identities i ON i.user_id=requested.user_id
  WHERE p.id IS NULL OR p.is_approved IS DISTINCT FROM true OR nullif(trim(p.full_name),'') IS NULL OR nullif(trim(p.batch),'') IS NULL
  OR p.phone IS NULL OR p.phone !~ '^\+?[0-9 ().-]+$' OR length(regexp_replace(p.phone,'[^0-9]','','g')) NOT BETWEEN 10 AND 15
  OR i.iqmg_number IS NULL OR i.status NOT IN('pending','verified') OR (is_team AND i.status<>'verified')) THEN RAISE EXCEPTION 'Every participant needs a complete approved profile and a college IQMG number; team members must be verified';END IF;
 IF is_team THEN
  IF NOT EXISTS(SELECT 1 FROM public.student_groups g WHERE g.name=p_team_name AND
   (SELECT array_agg(id ORDER BY id) FROM (SELECT g.owner_id id UNION SELECT m.user_id FROM public.student_group_members m WHERE m.group_id=g.id AND m.status='accepted') accepted)=
   (SELECT array_agg(id ORDER BY id) FROM unnest(p_user_ids) id)) THEN RAISE EXCEPTION 'Participants must match an accepted team';END IF;
 ELSIF members<>1 THEN RAISE EXCEPTION 'Choose an accepted team for multiple participants';END IF;
 SELECT * INTO e FROM public.events WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Event not found';END IF;
 IF e.registration_open IS DISTINCT FROM true OR e.visible IS FALSE OR (e.registration_timer_enabled IS TRUE AND (e.registration_opens_at>now() OR e.registration_closes_at<=now())) THEN RAISE EXCEPTION 'Registration is closed for this event';END IF;
 IF e.registration_mode_locked IS TRUE AND is_team IS DISTINCT FROM (e.registration_default_mode='team') THEN RAISE EXCEPTION 'Use the registration mode required by this event';END IF;
 IF is_team AND (members<coalesce(e.team_min_members,1) OR members>coalesce(e.team_max_members,100)) THEN RAISE EXCEPTION 'Your accepted team size does not meet this event requirement';END IF;
 IF EXISTS(SELECT 1 FROM public.registrations r WHERE r.event_id=p_event_id AND r.user_id=ANY(p_user_ids)) THEN RAISE EXCEPTION 'A participant already has an entry for this event. Check My registrations or contact the coordinator';END IF;
 IF e.max_participants IS NOT NULL AND coalesce(e.current_registrations,0)+1>e.max_participants THEN RAISE EXCEPTION 'This event is full';END IF;
 FOREACH participant IN ARRAY p_user_ids LOOP
  SELECT * INTO profile_record FROM public.profiles WHERE id=participant;
  INSERT INTO public.registrations(id,event_id,event_title,user_id,full_name,email,phone,college,participant_type,is_team_registration,team_name,total_members,registration_date,status,is_active)
  VALUES('RICO-'||gen_random_uuid()::text,e.id,e.title,participant,profile_record.full_name,coalesce((SELECT email FROM auth.users WHERE id=participant),''),profile_record.phone,profile_record.college,profile_record.batch,is_team,p_team_name,members,now(),CASE WHEN e.payment_enabled IS TRUE AND e.payment_amount>0 THEN 'payment_pending' ELSE 'pending' END,false);
 END LOOP;
 UPDATE public.events SET current_registrations=coalesce(current_registrations,0)+1 WHERE id=e.id;
 RETURN jsonb_build_object('success',true,'registered_count',1,'participant_count',members,'status',CASE WHEN e.payment_enabled IS TRUE AND e.payment_amount>0 THEN 'payment_pending' ELSE 'pending' END);
END $$;
CREATE OR REPLACE FUNCTION public.checkout_student_event(p_event_id text,p_user_ids uuid[],p_team_name text,p_participant_details jsonb,p_utr text,p_expected_payment jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e public.events;result jsonb;paid boolean;
BEGIN
 IF NOT public.session_is_current() OR NOT public.student_registration_ready() THEN RAISE EXCEPTION 'Complete your student profile and wait for account approval before registering';END IF;
 SELECT * INTO e FROM public.events WHERE id=p_event_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Event not found';END IF;
 paid:=e.payment_enabled IS TRUE AND coalesce(e.payment_amount,0)>0;
 IF p_expected_payment IS NULL OR jsonb_typeof(p_expected_payment)<>'object' OR (p_expected_payment->>'enabled')::boolean IS DISTINCT FROM paid
 OR (paid AND ((p_expected_payment->>'amount')::numeric IS DISTINCT FROM e.payment_amount OR nullif(p_expected_payment->>'upi','') IS DISTINCT FROM nullif(e.coordinator_upi_id,''))) THEN RAISE EXCEPTION 'Payment details changed. Review the current amount and recipient before continuing';END IF;
 IF paid THEN
  IF nullif(trim(e.coordinator_upi_id),'') IS NULL THEN RAISE EXCEPTION 'Payment recipient is not configured';END IF;
  IF p_utr IS NULL OR trim(p_utr)!~'^[A-Za-z0-9-]{6,64}$' THEN RAISE EXCEPTION 'A valid payment reference is required';END IF;
 END IF;
 result:=public.register_cart_event(p_event_id,p_user_ids,p_team_name,p_participant_details);
 IF paid THEN
  INSERT INTO public.payment_submissions(registration_id,event_id,user_id,utr_number,amount,submitted_at)
  SELECT r.id,e.id,r.user_id,upper(trim(p_utr)),e.payment_amount,now() FROM public.registrations r WHERE r.event_id=e.id AND r.user_id=ANY(p_user_ids);
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.student_registration_ready(),public.register_cart_event(text,uuid[],text,jsonb),public.checkout_student_event(text,uuid[],text,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.student_registration_ready(),public.checkout_student_event(text,uuid[],text,jsonb,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_cart_event(text,uuid[],text,jsonb) TO service_role;
DO $$ BEGIN IF to_regprocedure('public.checkout_cart_event(text,uuid[],text,jsonb,text)') IS NOT NULL THEN REVOKE EXECUTE ON FUNCTION public.checkout_cart_event(text,uuid[],text,jsonb,text) FROM PUBLIC,anon,authenticated;END IF;END $$;
-- Student inserts must use checkout so event capacity, payment and team consent are checked atomically.
-- Existing staff insert privileges stay unchanged.
DROP POLICY IF EXISTS student_registration_readiness_guard ON public.registrations;
CREATE POLICY student_registration_readiness_guard ON public.registrations AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(
 public.coordinates_event(event_id::text) OR public.admin_can_manage_pages(ARRAY['registrations','events'],ARRAY['can_registrations','can_events'])
);
NOTIFY pgrst,'reload schema';
COMMIT;
