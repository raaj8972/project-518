-- Only verified IQMG lookups and exact team-code requests can start membership.
BEGIN;
ALTER TABLE public.student_groups ADD COLUMN IF NOT EXISTS team_code text;
UPDATE public.student_groups SET team_code='TEAM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)) WHERE team_code IS NULL;
ALTER TABLE public.student_groups ALTER COLUMN team_code SET DEFAULT 'TEAM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
ALTER TABLE public.student_groups ALTER COLUMN team_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS student_group_team_code_unique ON public.student_groups(team_code);
CREATE TABLE IF NOT EXISTS public.student_team_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),group_id uuid NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('invite','join')),status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','rejected','cancelled','expired')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '72 hours',UNIQUE(group_id,user_id)
);
ALTER TABLE public.student_team_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_team_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.student_team_requests TO authenticated;GRANT ALL ON public.student_team_requests TO service_role;
-- Preserve earlier invitations without giving legacy clients a write bypass.
INSERT INTO public.student_team_requests(group_id,user_id,kind,status,created_at,expires_at)
 SELECT group_id,user_id,'invite',CASE WHEN coalesce(created_at,now())+interval '72 hours'>now() THEN 'pending' ELSE 'expired' END,coalesce(created_at,now()),coalesce(created_at,now())+interval '72 hours' FROM public.student_group_members WHERE status='pending' ON CONFLICT(group_id,user_id) DO NOTHING;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.student_groups,public.student_group_members FROM anon,authenticated;
GRANT SELECT ON public.student_groups,public.student_group_members TO authenticated;
GRANT ALL ON public.student_groups,public.student_group_members TO service_role;
CREATE OR REPLACE FUNCTION public.can_read_student_team(p_group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.session_is_current() AND (public.can_manage_iqmg_roster() OR EXISTS(SELECT 1 FROM public.student_groups g WHERE g.id=p_group AND (g.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.student_group_members m WHERE m.group_id=g.id AND m.user_id=auth.uid() AND m.status='accepted'))))
$$;
DO $$ DECLARE p record; BEGIN FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN('student_groups','student_group_members','student_team_requests') LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);END LOOP;END $$;
CREATE POLICY student_team_read ON public.student_groups FOR SELECT TO authenticated USING(public.can_read_student_team(id));
CREATE POLICY student_team_member_read ON public.student_group_members FOR SELECT TO authenticated USING(public.can_read_student_team(group_id) OR (public.session_is_current() AND user_id=auth.uid()));
CREATE POLICY student_team_request_read ON public.student_team_requests FOR SELECT TO authenticated USING(public.session_is_current() AND (user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.student_groups g WHERE g.id=group_id AND g.owner_id=auth.uid())));
CREATE OR REPLACE FUNCTION public.create_student_team(p_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result public.student_groups;BEGIN
 PERFORM public.require_verified_team_student();PERFORM public.consume_student_team_action('create_team',10,1440);
 IF length(trim(p_name)) NOT BETWEEN 2 AND 70 THEN RAISE EXCEPTION 'Use a team name between 2 and 70 characters';END IF;
 IF (SELECT count(*) FROM public.student_groups WHERE owner_id=auth.uid())>=10 THEN RAISE EXCEPTION 'You can own up to 10 teams';END IF;
 FOR attempt IN 1..5 LOOP BEGIN INSERT INTO public.student_groups(name,owner_id) VALUES(trim(p_name),auth.uid()) RETURNING * INTO result;EXIT;EXCEPTION WHEN unique_violation THEN IF attempt=5 THEN RAISE;END IF;END;END LOOP;
 RETURN to_jsonb(result);
END $$;
CREATE OR REPLACE FUNCTION public.find_student_by_iqmg(p_number text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;BEGIN
 PERFORM public.require_verified_team_student();PERFORM public.consume_student_team_action('iqmg_lookup',30,10);
 SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'batch',p.batch,'avatar_url',p.avatar_url,'iqmg_number',i.iqmg_number) INTO result FROM public.student_iqmg_identities i JOIN public.profiles p ON p.id=i.user_id WHERE i.iqmg_key=public.iqmg_key(p_number) AND i.status='verified' AND p.is_approved IS TRUE AND p.id<>auth.uid();RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.find_student_team(p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;BEGIN
 PERFORM public.require_verified_team_student();PERFORM public.consume_student_team_action('team_lookup',30,10);
 SELECT jsonb_build_object('id',g.id,'team_code',g.team_code,'name',g.name,'captain_name',p.full_name,'member_count',1+(SELECT count(DISTINCT m.user_id) FROM public.student_group_members m WHERE m.group_id=g.id AND m.status='accepted' AND m.user_id<>g.owner_id)) INTO result FROM public.student_groups g JOIN public.profiles p ON p.id=g.owner_id WHERE g.team_code=upper(trim(p_code));RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.start_student_team_request(p_group_id uuid,p_kind text,p_iqmg text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.student_groups;target uuid;previous public.student_team_requests;request_id uuid;recipient uuid;
BEGIN
 PERFORM public.require_verified_team_student();
 IF p_kind NOT IN('invite','join') THEN RAISE EXCEPTION 'Choose invite or join';END IF;
 PERFORM public.consume_student_team_action('team_request',20,1440);
 SELECT * INTO g FROM public.student_groups WHERE id=p_group_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Team not found';END IF;
 IF p_kind='invite' THEN
  IF g.owner_id<>auth.uid() THEN RAISE EXCEPTION 'Only the captain can invite students';END IF;
  SELECT i.user_id INTO target FROM public.student_iqmg_identities i JOIN public.profiles p ON p.id=i.user_id WHERE i.iqmg_key=public.iqmg_key(p_iqmg) AND i.status='verified' AND p.is_approved IS TRUE;
  IF target IS NULL THEN RAISE EXCEPTION 'No verified student was found for this IQMG number';END IF;
 ELSE target:=auth.uid();END IF;
 IF target=g.owner_id OR EXISTS(SELECT 1 FROM public.student_group_members WHERE group_id=g.id AND user_id=target AND status='accepted') THEN RAISE EXCEPTION 'This student is already in the team';END IF;
 IF (SELECT count(*) FROM public.student_team_requests WHERE (user_id=target OR group_id=g.id) AND status='pending' AND expires_at>now())>=20 THEN RAISE EXCEPTION 'Too many pending requests. Respond to existing requests first.';END IF;
 SELECT * INTO previous FROM public.student_team_requests WHERE group_id=g.id AND user_id=target FOR UPDATE;
 IF previous.status='pending' AND previous.expires_at>now() THEN RAISE EXCEPTION 'A request is already pending. Respond to it in Requests.';END IF;
 IF previous.status='rejected' AND previous.updated_at>now()-interval '24 hours' THEN RAISE EXCEPTION 'Wait 24 hours after a declined request before trying again';END IF;
 INSERT INTO public.student_team_requests(group_id,user_id,kind) VALUES(g.id,target,p_kind)
 ON CONFLICT(group_id,user_id) DO UPDATE SET kind=EXCLUDED.kind,status='pending',created_at=now(),updated_at=now(),expires_at=now()+interval '72 hours' RETURNING id INTO request_id;
 recipient:=CASE WHEN p_kind='invite' THEN target ELSE g.owner_id END;
 INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key) VALUES(recipient,'invitation',CASE WHEN p_kind='invite' THEN 'Team invitation' ELSE 'Team join request' END,g.name||' · respond in My teams','/dashboard/teams?tab=requests','team-request:'||request_id||':'||clock_timestamp()::text);
 RETURN request_id;
END $$;
CREATE OR REPLACE FUNCTION public.respond_student_team_request(p_request_id uuid,p_accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.student_team_requests;g public.student_groups;recipient uuid;
BEGIN
 PERFORM public.require_verified_team_student();SELECT * INTO r FROM public.student_team_requests WHERE id=p_request_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Request not found';END IF;
 SELECT * INTO g FROM public.student_groups WHERE id=r.group_id FOR UPDATE;
 IF (r.kind='invite' AND r.user_id<>auth.uid()) OR (r.kind='join' AND g.owner_id<>auth.uid()) THEN RAISE EXCEPTION 'You cannot respond to this request';END IF;
 IF r.status<>'pending' OR r.expires_at<=now() THEN RAISE EXCEPTION 'This request has expired or was already answered';END IF;
 IF p_accept THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.student_iqmg_identities i ON i.user_id=p.id WHERE p.id=r.user_id AND p.is_approved IS TRUE AND i.status='verified') THEN RAISE EXCEPTION 'The student must have a verified college ID';END IF;
  IF (SELECT count(*) FROM public.student_group_members WHERE group_id=g.id AND status='accepted')>=99 THEN RAISE EXCEPTION 'This team is full';END IF;
  INSERT INTO public.student_group_members(group_id,user_id,status,invited_by) VALUES(g.id,r.user_id,'accepted',g.owner_id) ON CONFLICT(group_id,user_id) DO UPDATE SET status='accepted',invited_by=g.owner_id,updated_at=now();
 END IF;
 UPDATE public.student_team_requests SET status=CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,updated_at=now() WHERE id=r.id;
 recipient:=CASE WHEN r.kind='invite' THEN g.owner_id ELSE r.user_id END;
 INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key) VALUES(recipient,'invitation',CASE WHEN p_accept THEN 'Team request accepted' ELSE 'Team request declined' END,g.name,'/dashboard/teams','team-answer:'||r.id||':'||clock_timestamp()::text);
END $$;
CREATE OR REPLACE FUNCTION public.cancel_student_team_request(p_request_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.student_team_requests;BEGIN
 IF NOT public.session_is_current() THEN RAISE EXCEPTION 'Sign in required';END IF;
 SELECT * INTO r FROM public.student_team_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'pending' OR NOT((r.kind='join' AND r.user_id=auth.uid()) OR(r.kind='invite' AND EXISTS(SELECT 1 FROM public.student_groups WHERE id=r.group_id AND owner_id=auth.uid()))) THEN RAISE EXCEPTION 'You cannot cancel this request';END IF;
 UPDATE public.student_team_requests SET status='cancelled',updated_at=now() WHERE id=r.id;
END $$;
CREATE OR REPLACE FUNCTION public.remove_student_team_member(p_group_id uuid,p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.session_is_current() OR NOT EXISTS(SELECT 1 FROM public.student_groups WHERE id=p_group_id AND (owner_id=auth.uid() OR p_user_id=auth.uid())) THEN RAISE EXCEPTION 'Only the captain can remove members; you may leave your own membership';END IF;
 IF EXISTS(SELECT 1 FROM public.student_groups WHERE id=p_group_id AND owner_id=p_user_id) THEN RAISE EXCEPTION 'The captain cannot leave their own team';END IF;
 DELETE FROM public.student_group_members WHERE group_id=p_group_id AND user_id=p_user_id;
 UPDATE public.student_team_requests SET status='cancelled',updated_at=now() WHERE group_id=p_group_id AND user_id=p_user_id;
END $$;
CREATE OR REPLACE FUNCTION public.delete_student_team(p_group_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN IF NOT public.session_is_current() OR NOT EXISTS(SELECT 1 FROM public.student_groups WHERE id=p_group_id AND owner_id=auth.uid()) THEN RAISE EXCEPTION 'Only the captain can delete this team';END IF;DELETE FROM public.student_groups WHERE id=p_group_id;END $$;
CREATE OR REPLACE FUNCTION public.get_student_team_workspace() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;BEGIN
 IF NOT public.session_is_current() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_approved IS TRUE) THEN RAISE EXCEPTION 'An approved student account is required';END IF;
 SELECT jsonb_build_object('identity',public.get_my_iqmg_identity(),
 'teams',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'team_code',g.team_code,'owner_id',g.owner_id,'captain_name',p.full_name,
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',v.id,'full_name',v.full_name,'batch',v.batch,'avatar_url',v.avatar_url,'captain',v.id=g.owner_id) ORDER BY v.id=g.owner_id DESC,v.full_name),'[]'::jsonb) FROM public.profiles v WHERE v.id=g.owner_id OR EXISTS(SELECT 1 FROM public.student_group_members m WHERE m.group_id=g.id AND m.user_id=v.id AND m.status='accepted'))
 ) ORDER BY g.created_at DESC),'[]'::jsonb) FROM public.student_groups g JOIN public.profiles p ON p.id=g.owner_id WHERE g.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.student_group_members m WHERE m.group_id=g.id AND m.user_id=auth.uid() AND m.status='accepted')),
 'requests',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'group_id',g.id,'team_code',g.team_code,'team_name',g.name,'kind',r.kind,'student_name',p.full_name,'student_batch',p.batch,'captain_name',c.full_name,'incoming',(r.kind='invite' AND r.user_id=auth.uid()) OR(r.kind='join' AND g.owner_id=auth.uid()),'expires_at',r.expires_at) ORDER BY r.created_at DESC),'[]'::jsonb) FROM public.student_team_requests r JOIN public.student_groups g ON g.id=r.group_id JOIN public.profiles p ON p.id=r.user_id JOIN public.profiles c ON c.id=g.owner_id WHERE r.status='pending' AND r.expires_at>now() AND (r.user_id=auth.uid() OR g.owner_id=auth.uid()))) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.student_team_pending_count() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN public.session_is_current() THEN (SELECT count(*)::integer FROM public.student_team_requests r JOIN public.student_groups g ON g.id=r.group_id WHERE r.status='pending' AND r.expires_at>now() AND ((r.kind='invite' AND r.user_id=auth.uid()) OR(r.kind='join' AND g.owner_id=auth.uid()))) ELSE 0 END
$$;
DO $$ DECLARE f record;BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('can_read_student_team','create_student_team','find_student_by_iqmg','find_student_team','start_student_team_request','respond_student_team_request','cancel_student_team_request','remove_student_team_member','delete_student_team','get_student_team_workspace','student_team_pending_count') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);END LOOP;END $$;
DO $$ DECLARE t text;BEGIN IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN FOREACH t IN ARRAY ARRAY['student_groups','student_group_members','student_team_requests'] LOOP IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);END IF;END LOOP;END IF;END $$;
DO $$ BEGIN IF to_regclass('public.group_invitations') IS NOT NULL THEN REVOKE INSERT ON public.group_invitations FROM anon,authenticated;END IF;END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
