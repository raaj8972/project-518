-- The dashboard cancels the current student's entry. A matching team name must
-- never authorize deleting another person's registration or an unrelated team.
BEGIN;
CREATE OR REPLACE FUNCTION public.cancel_registration(p_reg_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE registration public.registrations%ROWTYPE;
BEGIN
 IF NOT public.session_is_current() THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501';END IF;
 SELECT * INTO registration FROM public.registrations WHERE id=p_reg_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found or access denied' USING ERRCODE='42501';END IF;
 IF registration.is_active IS TRUE THEN RAISE EXCEPTION 'Cannot cancel registration once it has been activated by the coordinator.';END IF;
 DELETE FROM public.registrations WHERE id=p_reg_id AND user_id=auth.uid();
 UPDATE public.events SET current_registrations=greatest(0,coalesce(current_registrations,0)-1) WHERE id=registration.event_id;
 RETURN jsonb_build_object('success',true);
END $fn$;
REVOKE ALL ON FUNCTION public.cancel_registration(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_registration(text) TO authenticated,service_role;
COMMIT;
