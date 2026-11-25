-- Private college identity claims and administrator-reviewed PDF roster imports.
BEGIN;
CREATE OR REPLACE FUNCTION public.iqmg_key(value text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$ SELECT regexp_replace(upper(coalesce(value,'')),'[^A-Z0-9]','','g') $$;
CREATE OR REPLACE FUNCTION public.student_name_key(value text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$ SELECT trim(regexp_replace(upper(coalesce(value,'')),'[^A-Z0-9]+',' ','g')) $$;
CREATE OR REPLACE FUNCTION public.can_manage_iqmg_roster() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT public.session_is_current() AND public.admin_can_manage_pages(ARRAY['student-system'],ARRAY['can_registrations']) $$;
CREATE TABLE IF NOT EXISTS public.student_iqmg_identities(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 iqmg_number text, iqmg_key text GENERATED ALWAYS AS (public.iqmg_key(iqmg_number)) STORED,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','verified','correction_required')),
 note text, verified_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(iqmg_number IS NULL OR (length(public.iqmg_key(iqmg_number)) BETWEEN 3 AND 40))
);
CREATE UNIQUE INDEX IF NOT EXISTS student_iqmg_number_unique ON public.student_iqmg_identities(iqmg_key) WHERE iqmg_number IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.iqmg_roster_imports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES auth.users(id),
 file_name text NOT NULL,file_sha256 text NOT NULL, rows jsonb NOT NULL CHECK(jsonb_typeof(rows)='array' AND jsonb_array_length(rows) BETWEEN 1 AND 3000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','applied')),created_at timestamptz NOT NULL DEFAULT now(),applied_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.official_iqmg_roster(
 iqmg_key text PRIMARY KEY,iqmg_number text NOT NULL,full_name text NOT NULL,name_key text NOT NULL,batch text,
 source_import uuid NOT NULL REFERENCES public.iqmg_roster_imports(id),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.iqmg_identity_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),before_record jsonb,after_record jsonb,source_import uuid REFERENCES public.iqmg_roster_imports(id),changed_by uuid,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.student_team_action_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,action text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS student_team_action_rate_idx ON public.student_team_action_log(user_id,action,created_at);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['student_iqmg_identities','iqmg_roster_imports','official_iqmg_roster','iqmg_identity_audit','student_team_action_log'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
END LOOP;END $$;
GRANT SELECT ON public.student_iqmg_identities,public.iqmg_roster_imports TO authenticated;
DROP POLICY IF EXISTS iqmg_identity_private_read ON public.student_iqmg_identities;
CREATE POLICY iqmg_identity_private_read ON public.student_iqmg_identities FOR SELECT TO authenticated USING(public.session_is_current() AND (user_id=auth.uid() OR public.can_manage_iqmg_roster()));
DROP POLICY IF EXISTS iqmg_import_staff_read ON public.iqmg_roster_imports;
CREATE POLICY iqmg_import_staff_read ON public.iqmg_roster_imports FOR SELECT TO authenticated USING(public.can_manage_iqmg_roster());
CREATE OR REPLACE FUNCTION public.consume_student_team_action(p_action text,p_limit integer,p_minutes integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.session_is_current() THEN RAISE EXCEPTION 'Sign in required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_action,0));
 IF (SELECT count(*) FROM public.student_team_action_log WHERE user_id=auth.uid() AND action=p_action AND created_at>now()-make_interval(mins=>p_minutes))>=p_limit THEN RAISE EXCEPTION 'Too many requests. Please try again later.';END IF;
 INSERT INTO public.student_team_action_log(user_id,action) VALUES(auth.uid(),p_action);
END $$;
CREATE OR REPLACE FUNCTION public.get_my_iqmg_identity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN public.session_is_current() THEN (SELECT to_jsonb(i)-'iqmg_key' FROM public.student_iqmg_identities i WHERE user_id=auth.uid()) ELSE NULL END
$$;
CREATE OR REPLACE FUNCTION public.claim_student_iqmg(p_number text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_record public.student_iqmg_identities;v_number text:=upper(trim(p_number));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Create your student profile first';END IF;
 PERFORM public.consume_student_team_action('iqmg_claim',10,1440);
 IF v_number IS NULL OR length(public.iqmg_key(v_number)) NOT BETWEEN 3 AND 40 OR v_number !~ '^[A-Z0-9 /_-]+$' THEN RAISE EXCEPTION 'Enter the IQMG number printed on your college ID';END IF;
 SELECT * INTO old_record FROM public.student_iqmg_identities WHERE user_id=auth.uid() FOR UPDATE;
 IF old_record.status='verified' THEN
  IF public.iqmg_key(v_number)<>old_record.iqmg_key THEN RAISE EXCEPTION 'Your verified IQMG can only be corrected from the college roster by admin';END IF;
  RETURN public.get_my_iqmg_identity();
 END IF;
 BEGIN
 INSERT INTO public.student_iqmg_identities(user_id,iqmg_number,status) VALUES(auth.uid(),v_number,'pending')
 ON CONFLICT(user_id) DO UPDATE SET iqmg_number=EXCLUDED.iqmg_number,status='pending',note=NULL,verified_at=NULL,updated_at=now();
 EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'This IQMG number is already in use. Ask admin to correct it using the college roster.';END;
 RETURN public.get_my_iqmg_identity();
END $$;
CREATE OR REPLACE FUNCTION public.require_verified_team_student() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.session_is_current() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_approved IS TRUE) THEN RAISE EXCEPTION 'An approved student account is required';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.student_iqmg_identities WHERE user_id=auth.uid() AND status='verified') THEN RAISE EXCEPTION 'Your college IQMG number must be verified before using team requests';END IF;
 RETURN auth.uid();
END $$;
-- A verified college identity cannot silently acquire another student's name.
CREATE OR REPLACE FUNCTION public.guard_verified_iqmg_name() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF public.student_name_key(NEW.full_name) IS DISTINCT FROM public.student_name_key(OLD.full_name)
 AND EXISTS(SELECT 1 FROM public.student_iqmg_identities WHERE user_id=OLD.id AND status='verified')
 AND auth.uid() IS NOT NULL AND NOT public.can_manage_iqmg_roster() THEN RAISE EXCEPTION 'Ask admin to correct the name linked to your verified college ID';END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_verified_iqmg_name ON public.profiles;
CREATE TRIGGER guard_verified_iqmg_name BEFORE UPDATE OF full_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_verified_iqmg_name();
CREATE OR REPLACE FUNCTION public.preview_iqmg_roster(p_import_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.can_manage_iqmg_roster() THEN RAISE EXCEPTION 'Student management access required';END IF;
 WITH input AS(SELECT r.value row,r.ordinality::integer row_index FROM public.iqmg_roster_imports i CROSS JOIN LATERAL jsonb_array_elements(i.rows) WITH ORDINALITY r WHERE i.id=p_import_id),
 matched AS(SELECT x.*,public.iqmg_key(row->>'iqmg_number') number_key,
 (SELECT count(*) FROM input d WHERE public.iqmg_key(d.row->>'iqmg_number')=public.iqmg_key(x.row->>'iqmg_number')) duplicate_numbers,
 (SELECT count(*) FROM input d WHERE public.student_name_key(d.row->>'full_name')=public.student_name_key(x.row->>'full_name') AND public.student_name_key(d.row->>'batch')=public.student_name_key(x.row->>'batch')) duplicate_names,
 (SELECT count(*) FROM public.profiles p WHERE public.student_name_key(p.full_name)=public.student_name_key(x.row->>'full_name') AND (nullif(x.row->>'batch','') IS NULL OR public.student_name_key(p.batch)=public.student_name_key(x.row->>'batch'))) matches,
 (SELECT p.id FROM public.profiles p WHERE public.student_name_key(p.full_name)=public.student_name_key(x.row->>'full_name') AND (nullif(x.row->>'batch','') IS NULL OR public.student_name_key(p.batch)=public.student_name_key(x.row->>'batch')) ORDER BY p.id LIMIT 1) matched_user
 FROM input x)
 SELECT coalesce(jsonb_agg(jsonb_build_object('row_index',row_index,'iqmg_number',row->>'iqmg_number','full_name',row->>'full_name','batch',row->>'batch','matched_user',CASE WHEN matches=1 THEN matched_user ELSE NULL END,
 'status',CASE WHEN length(number_key) NOT BETWEEN 3 AND 40 OR public.student_name_key(row->>'full_name')='' THEN 'invalid' WHEN duplicate_numbers>1 OR duplicate_names>1 OR matches>1 OR (SELECT count(*) FROM matched other WHERE other.matched_user=matched.matched_user AND other.matches=1)>1 THEN 'ambiguous' WHEN matches=0 THEN 'no_account' ELSE 'matched' END,
 'current_claimant',(SELECT p.full_name FROM public.student_iqmg_identities q JOIN public.profiles p ON p.id=q.user_id WHERE q.iqmg_key=number_key AND q.user_id IS DISTINCT FROM matched_user)) ORDER BY row_index),'[]'::jsonb) INTO result FROM matched;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.apply_iqmg_roster(p_import_id uuid,p_rows integer[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb;identity public.student_iqmg_identities;target uuid;number_key text;verified integer:=0;stored integer:=0;corrected integer:=0;before_value jsonb;
BEGIN
 IF NOT public.can_manage_iqmg_roster() THEN RAISE EXCEPTION 'Student management access required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('iqmg-roster-apply',0));
 PERFORM 1 FROM public.iqmg_roster_imports WHERE id=p_import_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Import not found';END IF;
 IF coalesce(cardinality(p_rows),0)=0 THEN RAISE EXCEPTION 'Select reviewed rows to verify';END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_rows) chosen WHERE chosen IS NULL OR chosen<1 OR chosen>(SELECT jsonb_array_length(rows) FROM public.iqmg_roster_imports WHERE id=p_import_id)) THEN RAISE EXCEPTION 'Review valid roster rows before applying';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(public.preview_iqmg_roster(p_import_id)) WHERE (value->>'row_index')::integer=ANY(p_rows) LOOP
  IF item->>'status' IN('invalid','ambiguous') THEN RAISE EXCEPTION 'Ambiguous or invalid rows must be resolved in the source PDF';END IF;
  number_key:=public.iqmg_key(item->>'iqmg_number');
  INSERT INTO public.official_iqmg_roster(iqmg_key,iqmg_number,full_name,name_key,batch,source_import)
  VALUES(number_key,item->>'iqmg_number',item->>'full_name',public.student_name_key(item->>'full_name'),nullif(item->>'batch',''),p_import_id)
  ON CONFLICT(iqmg_key) DO UPDATE SET iqmg_number=EXCLUDED.iqmg_number,full_name=EXCLUDED.full_name,name_key=EXCLUDED.name_key,batch=EXCLUDED.batch,source_import=EXCLUDED.source_import,updated_at=now();stored:=stored+1;
  IF item->>'status'<>'matched' THEN CONTINUE;END IF;
  target:=(item->>'matched_user')::uuid;
  PERFORM 1 FROM public.profiles p WHERE p.id=target AND public.student_name_key(p.full_name)=public.student_name_key(item->>'full_name') AND (nullif(item->>'batch','') IS NULL OR public.student_name_key(p.batch)=public.student_name_key(item->>'batch')) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A student profile changed. Review the roster again.';END IF;
  SELECT * INTO identity FROM public.student_iqmg_identities WHERE iqmg_key=number_key AND user_id<>target FOR UPDATE;
  IF FOUND THEN
   INSERT INTO public.iqmg_identity_audit(user_id,before_record,source_import,changed_by) VALUES(identity.user_id,to_jsonb(identity),p_import_id,auth.uid());
   UPDATE public.student_iqmg_identities SET iqmg_number=NULL,status='correction_required',note='Your earlier number did not match the college roster. Enter your correct IQMG number or contact support.',verified_at=NULL,updated_at=now() WHERE user_id=identity.user_id;
   INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key) VALUES(identity.user_id,'invitation','College ID needs correction','Your IQMG claim was corrected against the college roster. Please check My profile.','/dashboard/settings','iqmg-corrected:'||p_import_id||':'||identity.user_id) ON CONFLICT DO NOTHING;corrected:=corrected+1;
  END IF;
  SELECT to_jsonb(i) INTO before_value FROM public.student_iqmg_identities i WHERE user_id=target FOR UPDATE;
  INSERT INTO public.student_iqmg_identities(user_id,iqmg_number,status,verified_at,note) VALUES(target,item->>'iqmg_number','verified',now(),'Verified against the college PDF roster')
   ON CONFLICT(user_id) DO UPDATE SET iqmg_number=EXCLUDED.iqmg_number,status='verified',verified_at=now(),note=EXCLUDED.note,updated_at=now();
  INSERT INTO public.iqmg_identity_audit(user_id,before_record,after_record,source_import,changed_by) VALUES(target,before_value,(SELECT to_jsonb(i) FROM public.student_iqmg_identities i WHERE user_id=target),p_import_id,auth.uid());
  INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key) VALUES(target,'invitation','College IQMG verified','Your college number was verified against the official roster. You can now use team invitations and join requests.','/dashboard/teams','iqmg-verified:'||p_import_id||':'||target) ON CONFLICT DO NOTHING;
  verified:=verified+1;
 END LOOP;
 UPDATE public.iqmg_roster_imports SET status='applied',applied_at=now() WHERE id=p_import_id;
 RETURN jsonb_build_object('roster_rows',stored,'verified',verified,'corrected_claims',corrected);
END $$;
DO $$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('iqmg_key','student_name_key','can_manage_iqmg_roster','consume_student_team_action','get_my_iqmg_identity','claim_student_iqmg','require_verified_team_student','guard_verified_iqmg_name','preview_iqmg_roster','apply_iqmg_roster') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);END LOOP;END $$;
GRANT EXECUTE ON FUNCTION public.can_manage_iqmg_roster(),public.get_my_iqmg_identity(),public.claim_student_iqmg(text),public.preview_iqmg_roster(uuid),public.apply_iqmg_roster(uuid,integer[]) TO authenticated;
-- Generated-column evaluation also uses the harmless normalization function.
GRANT EXECUTE ON FUNCTION public.iqmg_key(text),public.student_name_key(text) TO authenticated,service_role;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='student_iqmg_identities' AND schemaname='public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.student_iqmg_identities;END IF;END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
