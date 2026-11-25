-- Version 2: verified XP, performance-only rankings, edition history, and first-login tours.
BEGIN;
CREATE OR REPLACE FUNCTION public.current_student_festival_year() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce((SELECT brand_year FROM public.homepage_settings WHERE id=1),extract(year FROM now() AT TIME ZONE 'Asia/Kolkata')::integer)
$$;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS festival_year integer;
UPDATE public.events SET festival_year=CASE WHEN date ~ '^20[0-9]{2}-' THEN left(date,4)::integer ELSE public.current_student_festival_year() END WHERE festival_year IS NULL;
ALTER TABLE public.events ALTER COLUMN festival_year SET DEFAULT public.current_student_festival_year();
ALTER TABLE public.events ALTER COLUMN festival_year SET NOT NULL;
CREATE TABLE IF NOT EXISTS public.student_event_participation(
 registration_id text PRIMARY KEY REFERENCES public.registrations(id) ON DELETE CASCADE,
 verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.student_verified_xp_awards(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 festival_year integer NOT NULL,action text NOT NULL CHECK(action IN('profile_completed','daily_checkin')),
 source_key text NOT NULL,xp integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,festival_year,source_key),
 CHECK((action='profile_completed' AND xp=50) OR (action='daily_checkin' AND xp=5))
);
CREATE UNIQUE INDEX IF NOT EXISTS student_xp_source_once ON public.student_verified_xp_awards(user_id,source_key);
CREATE UNIQUE INDEX IF NOT EXISTS student_profile_xp_once ON public.student_verified_xp_awards(user_id) WHERE action='profile_completed';
CREATE TABLE IF NOT EXISTS public.student_dashboard_onboarding(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,tour_version integer NOT NULL DEFAULT 1,
 status text NOT NULL CHECK(status IN('completed','skipped')),seen_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,tour_version)
);
ALTER TABLE public.student_event_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_verified_xp_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dashboard_onboarding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_event_participation,public.student_verified_xp_awards,public.student_dashboard_onboarding FROM anon,authenticated;
GRANT SELECT ON public.student_event_participation,public.student_verified_xp_awards TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.student_dashboard_onboarding TO authenticated;
GRANT ALL ON public.student_event_participation,public.student_verified_xp_awards,public.student_dashboard_onboarding TO service_role;
CREATE OR REPLACE FUNCTION public.can_verify_student_registration(p_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.session_is_current() AND EXISTS(SELECT 1 FROM public.registrations r WHERE r.id=p_id AND (public.coordinates_event(r.event_id) OR public.admin_can_manage_pages(ARRAY['registrations'],ARRAY['can_registrations'])))
$$;
DROP POLICY IF EXISTS participation_read ON public.student_event_participation;
CREATE POLICY participation_read ON public.student_event_participation FOR SELECT TO authenticated USING(public.can_verify_student_registration(registration_id) OR EXISTS(SELECT 1 FROM public.registrations r WHERE r.id=registration_id AND r.user_id=auth.uid()));
DROP POLICY IF EXISTS verified_xp_read ON public.student_verified_xp_awards;
CREATE POLICY verified_xp_read ON public.student_verified_xp_awards FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS student_tour_own ON public.student_dashboard_onboarding;
CREATE POLICY student_tour_own ON public.student_dashboard_onboarding TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- One result per student/event; duplicate registrations cannot multiply scores.
CREATE OR REPLACE VIEW public.student_verified_event_scores AS
WITH qualified AS(
 SELECT r.user_id,r.event_id,rr.round_id,
 bool_or(lower(er.name) ~ '(^|[^a-z])final(e|s)?([^a-z]|$)' AND lower(er.name) !~ '(semi|quarter)[ -]?final') is_final,
 max(CASE rr.prize_rank WHEN '1st' THEN 50 WHEN '2nd' THEN 30 WHEN '3rd' THEN 20 ELSE 0 END) prize
 FROM public.registrations r JOIN public.registration_rounds rr ON rr.registration_id=r.id AND rr.status='qualified'
 JOIN public.event_rounds er ON er.id=rr.round_id AND er.event_id=r.event_id
 WHERE r.status='approved' AND r.deleted_at IS NULL AND r.user_id IS NOT NULL
 GROUP BY r.user_id,r.event_id,rr.round_id
), attendance AS(
 SELECT DISTINCT r.user_id,r.event_id FROM public.registrations r JOIN public.student_event_participation a ON a.registration_id=r.id
 WHERE r.status='approved' AND r.deleted_at IS NULL AND r.user_id IS NOT NULL
 UNION SELECT user_id,event_id FROM qualified
)
SELECT a.user_id,a.event_id,e.festival_year,e.title,
 count(q.round_id)::integer qualified_rounds,
 (count(q.round_id) FILTER(WHERE NOT q.is_final))::integer nonfinal_rounds,
 (count(q.round_id) FILTER(WHERE q.is_final))::integer final_rounds,
 coalesce(max(q.prize),0)::integer prize_points,
 (100+count(q.round_id)*50)::integer xp,
 (20+count(q.round_id) FILTER(WHERE NOT q.is_final)*10+count(q.round_id) FILTER(WHERE q.is_final)*20+coalesce(max(q.prize),0))::integer r_points
FROM attendance a JOIN public.events e ON e.id=a.event_id LEFT JOIN qualified q ON q.user_id=a.user_id AND q.event_id=a.event_id
GROUP BY a.user_id,a.event_id,e.festival_year,e.title;
REVOKE ALL ON public.student_verified_event_scores FROM anon,authenticated;

CREATE OR REPLACE VIEW public.student_rewards_scoreboard AS
WITH years AS(SELECT public.current_student_festival_year() festival_year UNION SELECT festival_year FROM public.student_verified_event_scores UNION SELECT festival_year FROM public.student_verified_xp_awards),
ordered_events AS(SELECT s.*,row_number() OVER(PARTITION BY user_id,festival_year ORDER BY r_points DESC,event_id) best FROM public.student_verified_event_scores s),
results AS(
 SELECT user_id,festival_year,count(*)::integer verified_events,sum(xp)::integer event_xp,
 coalesce(sum(r_points) FILTER(WHERE best<=3),0)::integer r_points,
 count(*) FILTER(WHERE best<=3)::integer scoring_events,
 coalesce(sum(nonfinal_rounds*10) FILTER(WHERE best<=3),0)::integer round_points,
 coalesce(sum(final_rounds*20) FILTER(WHERE best<=3),0)::integer final_points,
 coalesce(sum(prize_points) FILTER(WHERE best<=3),0)::integer prize_points,
 sum(qualified_rounds)::integer rounds_cleared,array_agg(title ORDER BY r_points DESC,event_id) participated_events
 FROM ordered_events GROUP BY user_id,festival_year
), activity AS(SELECT user_id,sum(xp)::integer xp FROM public.student_verified_xp_awards GROUP BY user_id),
lifetime AS(SELECT user_id,sum(xp)::integer event_xp,count(*)::integer verified_events FROM public.student_verified_event_scores GROUP BY user_id),
base AS(
 SELECT p.id,p.full_name,p.username,p.avatar_url,p.aura_color,p.background_url,p.batch,coalesce(p.likes_count,0) likes_count,y.festival_year,
 coalesce(l.verified_events,0) verified_events,coalesce(l.event_xp,0)+coalesce(a.xp,0) xp,
 coalesce(r.r_points,0) hype_score,coalesce(r.rounds_cleared,0) rounds_cleared,coalesce(r.participated_events,ARRAY[]::text[]) participated_events,
 jsonb_build_object('likes',0,'participation',coalesce(r.scoring_events,0)*20,'rounds',coalesce(r.round_points,0),'finalRound',coalesce(r.final_points,0),'prizes',coalesce(r.prize_points,0),'events_count',coalesce(r.scoring_events,0)) points_breakdown
 FROM public.profiles p CROSS JOIN years y LEFT JOIN results r ON r.user_id=p.id AND r.festival_year=y.festival_year LEFT JOIN activity a ON a.user_id=p.id LEFT JOIN lifetime l ON l.user_id=p.id
 WHERE p.is_approved IS TRUE AND p.full_name IS NOT NULL AND (y.festival_year=public.current_student_festival_year() OR r.user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.student_verified_xp_awards aw WHERE aw.user_id=p.id AND aw.festival_year=y.festival_year))
)
SELECT b.*,CASE WHEN xp>=1000 AND verified_events>=2 THEN 'elite' WHEN xp>=500 THEN 'gold' WHEN xp>=100 THEN 'silver' ELSE 'bronze' END tier,
 CASE WHEN hype_score>0 THEN rank() OVER(PARTITION BY festival_year ORDER BY hype_score DESC)::integer ELSE 0 END rank
FROM base b;
REVOKE ALL ON public.student_rewards_scoreboard FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.get_student_scoreboard(p_year integer DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('year',coalesce(p_year,public.current_student_festival_year()),'editions',(SELECT coalesce(jsonb_agg(y ORDER BY y DESC),'[]'::jsonb) FROM(SELECT DISTINCT festival_year y FROM public.student_rewards_scoreboard) z),
 'students',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.hype_score DESC,s.full_name,s.id),'[]'::jsonb) FROM public.student_rewards_scoreboard s WHERE s.festival_year=coalesce(p_year,public.current_student_festival_year())))
$$;
CREATE TABLE IF NOT EXISTS public.student_legacy_xp_snapshot(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,xp_total integer,tier text,captured_at timestamptz DEFAULT now());
INSERT INTO public.student_legacy_xp_snapshot(user_id,xp_total,tier) SELECT id,xp_total,tier FROM public.student_xp ON CONFLICT DO NOTHING;
REVOKE ALL ON public.student_legacy_xp_snapshot FROM PUBLIC,anon,authenticated;
ALTER TABLE public.student_legacy_xp_snapshot ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_legacy_xp_snapshot TO service_role;
ALTER TABLE public.student_xp ADD COLUMN IF NOT EXISTS verified_events integer NOT NULL DEFAULT 0;
ALTER TABLE public.student_xp ADD COLUMN IF NOT EXISTS festival_year integer;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.student_xp,public.student_activity_log FROM anon,authenticated;
-- Retire automatic registration/like XP before installing the verified award function.
DROP TRIGGER IF EXISTS trg_xp_multi_event ON public.registrations;
DROP TRIGGER IF EXISTS trg_xp_registration ON public.registrations;
CREATE OR REPLACE FUNCTION public.trg_update_profile_likes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' THEN UPDATE public.profiles SET likes_count=coalesce(likes_count,0)+1 WHERE id=NEW.profile_id;
 ELSIF TG_OP='DELETE' THEN UPDATE public.profiles SET likes_count=greatest(0,coalesce(likes_count,0)-1) WHERE id=OLD.profile_id;
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.sync_verified_student_xp(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.student_xp(id,xp_total,tier,verified_events,festival_year)
 SELECT id,xp,tier,verified_events,festival_year FROM public.student_rewards_scoreboard WHERE id=p_user AND festival_year=public.current_student_festival_year()
 ON CONFLICT(id) DO UPDATE SET xp_total=EXCLUDED.xp_total,tier=EXCLUDED.tier,verified_events=EXCLUDED.verified_events,festival_year=EXCLUDED.festival_year,updated_at=now()
 WHERE (student_xp.xp_total,student_xp.tier,student_xp.verified_events,student_xp.festival_year) IS DISTINCT FROM (EXCLUDED.xp_total,EXCLUDED.tier,EXCLUDED.verified_events,EXCLUDED.festival_year);
END $$;
CREATE OR REPLACE FUNCTION public.record_verified_profile_xp(p_user uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 INSERT INTO public.student_verified_xp_awards(user_id,festival_year,action,source_key,xp)
 SELECT id,public.current_student_festival_year(),'profile_completed','profile_completed',50 FROM public.profiles
 WHERE id=p_user AND is_approved IS TRUE AND nullif(trim(full_name),'') IS NOT NULL AND nullif(trim(phone),'') IS NOT NULL AND nullif(trim(batch),'') IS NOT NULL
 ON CONFLICT DO NOTHING
$$;
CREATE OR REPLACE FUNCTION public.refresh_student_rewards() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.session_is_current() THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM public.record_verified_profile_xp(auth.uid());PERFORM public.sync_verified_student_xp(auth.uid());
 SELECT jsonb_build_object('total_xp',xp,'tier',tier,'verified_events',verified_events,'festival_year',festival_year) INTO result FROM public.student_rewards_scoreboard WHERE id=auth.uid() AND festival_year=public.current_student_festival_year();
 RETURN coalesce(result,jsonb_build_object('total_xp',0,'tier','bronze','verified_events',0,'festival_year',public.current_student_festival_year()));
END $$;
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid,p_action text,p_xp integer,p_meta jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.session_is_current() OR p_user_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_approved IS TRUE) THEN RAISE EXCEPTION 'Your own approved account is required'; END IF;
 IF p_action='daily_checkin' THEN
  IF p_xp<>5 THEN RAISE EXCEPTION 'Invalid XP amount'; END IF;
  INSERT INTO public.student_verified_xp_awards(user_id,festival_year,action,source_key,xp) VALUES(auth.uid(),public.current_student_festival_year(),'daily_checkin','checkin:'||(now() AT TIME ZONE 'Asia/Kolkata')::date::text,5) ON CONFLICT DO NOTHING;
 ELSIF p_action='profile_completed' THEN
  IF p_xp<>50 THEN RAISE EXCEPTION 'Invalid XP amount'; END IF;
 ELSIF p_action IN('profile_like_interaction','submitted_shoutout') THEN RETURN;
 ELSE RAISE EXCEPTION 'This activity does not award XP'; END IF;
 PERFORM public.record_verified_profile_xp(auth.uid());PERFORM public.sync_verified_student_xp(auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.verify_student_participation(p_registration_id text,p_verified boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.can_verify_student_registration(p_registration_id) THEN RAISE EXCEPTION 'Assigned coordinator or registration administrator required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.registrations WHERE id=p_registration_id AND status='approved' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Only approved entries can be verified'; END IF;
 IF p_verified THEN INSERT INTO public.student_event_participation(registration_id,verified_by) VALUES(p_registration_id,auth.uid()) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.student_event_participation WHERE registration_id=p_registration_id;END IF;
END $$;
-- Batch seed before attaching row triggers: do not recalculate the full board once per existing profile.
INSERT INTO public.student_verified_xp_awards(user_id,festival_year,action,source_key,xp)
SELECT id,public.current_student_festival_year(),'profile_completed','profile_completed',50 FROM public.profiles
WHERE is_approved IS TRUE AND nullif(trim(full_name),'') IS NOT NULL AND nullif(trim(phone),'') IS NOT NULL AND nullif(trim(batch),'') IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO public.student_xp(id,xp_total,tier,verified_events,festival_year)
SELECT id,xp,tier,verified_events,festival_year FROM public.student_rewards_scoreboard WHERE festival_year=public.current_student_festival_year()
ON CONFLICT(id) DO UPDATE SET xp_total=EXCLUDED.xp_total,tier=EXCLUDED.tier,verified_events=EXCLUDED.verified_events,festival_year=EXCLUDED.festival_year,updated_at=now()
WHERE (student_xp.xp_total,student_xp.tier,student_xp.verified_events,student_xp.festival_year) IS DISTINCT FROM (EXCLUDED.xp_total,EXCLUDED.tier,EXCLUDED.verified_events,EXCLUDED.festival_year);
-- Keep personal XP in sync after coordinator corrections as well as new awards.
CREATE OR REPLACE FUNCTION public.student_reward_source_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE student uuid; previous uuid;
BEGIN
 IF TG_TABLE_NAME='profiles' THEN
  student:=NEW.id; PERFORM public.record_verified_profile_xp(student);
 ELSIF TG_TABLE_NAME='student_verified_xp_awards' THEN
  student:=CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 ELSIF TG_TABLE_NAME='registrations' THEN
  student:=CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  IF TG_OP='UPDATE' THEN previous:=OLD.user_id; END IF;
 ELSE
  SELECT user_id INTO student FROM public.registrations WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.registration_id ELSE NEW.registration_id END;
  IF TG_OP='UPDATE' AND OLD.registration_id IS DISTINCT FROM NEW.registration_id THEN
   SELECT user_id INTO previous FROM public.registrations WHERE id=OLD.registration_id;
  END IF;
 END IF;
 IF student IS NOT NULL THEN PERFORM public.sync_verified_student_xp(student); END IF;
 IF previous IS NOT NULL AND previous IS DISTINCT FROM student THEN PERFORM public.sync_verified_student_xp(previous); END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['registrations','registration_rounds','student_event_participation','student_verified_xp_awards'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS student_rewards_sync ON public.%I',t);
 EXECUTE format('CREATE TRIGGER student_rewards_sync AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.student_reward_source_changed()',t);
 END LOOP;
END $$;
DROP TRIGGER IF EXISTS student_rewards_profile_sync ON public.profiles;
CREATE TRIGGER student_rewards_profile_sync AFTER INSERT OR UPDATE OF full_name,phone,batch,is_approved ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.student_reward_source_changed();
-- Protect qualifications used as reward evidence, even if legacy permissive policies remain.
DO $$ DECLARE op text; BEGIN
 FOREACH op IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS reward_round_%s_guard ON public.registration_rounds',lower(op));
  IF op='INSERT' THEN
   EXECUTE 'CREATE POLICY reward_round_insert_guard ON public.registration_rounds AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.registrations r JOIN public.event_rounds er ON er.event_id=r.event_id WHERE r.id=registration_id AND er.id=round_id AND public.can_verify_student_registration(r.id)))';
  ELSIF op='UPDATE' THEN
   EXECUTE 'CREATE POLICY reward_round_update_guard ON public.registration_rounds AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.can_verify_student_registration(registration_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.registrations r JOIN public.event_rounds er ON er.event_id=r.event_id WHERE r.id=registration_id AND er.id=round_id AND public.can_verify_student_registration(r.id)))';
  ELSE EXECUTE 'CREATE POLICY reward_round_delete_guard ON public.registration_rounds AS RESTRICTIVE FOR DELETE TO authenticated USING(public.can_verify_student_registration(registration_id))'; END IF;
 END LOOP;
END $$;
-- Explicitly restrict all mutation operations; SELECT remains available under the existing safe read policy.
DROP POLICY IF EXISTS reward_round_write ON public.registration_rounds;
CREATE POLICY reward_round_write ON public.registration_rounds FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.registrations r WHERE r.id=registration_id AND public.can_verify_student_registration(r.id))) WITH CHECK(EXISTS(SELECT 1 FROM public.registrations r WHERE r.id=registration_id AND public.can_verify_student_registration(r.id)));
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('current_student_festival_year','can_verify_student_registration','get_student_scoreboard','sync_verified_student_xp','record_verified_profile_xp','refresh_student_rewards','award_xp','verify_student_participation','student_reward_source_changed') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.get_student_scoreboard(integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.current_student_festival_year(),public.can_verify_student_registration(text),public.refresh_student_rewards(),public.award_xp(uuid,text,integer,jsonb),public.verify_student_participation(text,boolean) TO authenticated;
-- Existing balances remain in the legacy log; current displays use verified edition rewards.

DO $$ DECLARE t text; BEGIN IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
 FOREACH t IN ARRAY ARRAY['student_event_participation','student_verified_xp_awards'] LOOP
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);END IF;
 END LOOP;END IF;END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
