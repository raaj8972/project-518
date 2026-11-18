-- Only temporary negative-id fixtures inside a subtransaction; all are rolled back.
DO $$
DECLARE owner_id uuid; fixture bigint := -1000000000 - floor(random()*100000000)::bigint; seen integer;
BEGIN
  SELECT user_id::uuid INTO owner_id FROM public.admin_users
  WHERE role='owner' AND user_id ~ '^[0-9a-fA-F-]{36}$'
    AND NOT EXISTS(SELECT 1 FROM public.revoked_admin_accounts revoked WHERE revoked.user_id=admin_users.user_id)
  LIMIT 1;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'No active owner found for the scoped permission check'; END IF;
  BEGIN
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','iat',extract(epoch from now())::bigint+1)::text,true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    IF NOT public.admin_can_manage_pages(ARRAY['rico-family'],ARRAY['can_core_team','can_faculty']) THEN RAISE EXCEPTION 'Rico Family owner permission failed'; END IF;
    INSERT INTO public.core_committees(id,name,description,is_core,enabled,order_position) VALUES(fixture,'Rico Family audit fixture','',true,false,9999);
    INSERT INTO public.faculty_heads(id,name,title,image,description,enabled,phone,social_links) OVERRIDING SYSTEM VALUE VALUES(fixture::int,'Rico Family audit faculty','Convenor','audit-placeholder','',false,'+919830000011','{"instagram":"https://www.instagram.com/audit.profile/","facebook":"https://www.facebook.com/audit.profile/","batch":"2023–2028"}');
    INSERT INTO public.core_team_members(id,committee_id,name,image,is_head,is_council,enabled,phone,social_links)
    VALUES(fixture,fixture,'Audit head','audit-placeholder',true,false,true,'+919830000011','{"batch":"2023–2028","instagram":"https://www.instagram.com/audit.profile/"}'),
      (fixture-1,fixture,'Audit member','audit-placeholder',false,false,true,NULL,'{"batch":"2023–2028"}'),
      (fixture-2,fixture,'Audit council','audit-placeholder',false,true,false,'+919830000011','{"batch":"2023–2028"}');
    UPDATE public.core_team_members SET color='blue',phone='+919830000022',social_links=social_links || '{"batch":"2024–2029"}'::jsonb WHERE id=fixture-2;
    IF NOT EXISTS(SELECT 1 FROM public.core_team_members WHERE id=fixture-2 AND color='blue' AND phone='+919830000022' AND social_links->>'batch'='2024–2029') THEN RAISE EXCEPTION 'Profile/contact/light save failed'; END IF;
    SELECT count(*) INTO seen FROM public.core_team_members WHERE id BETWEEN fixture-2 AND fixture;
    IF seen<>3 THEN RAISE EXCEPTION 'Admin could not reload all fixture profiles'; END IF;
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
    IF EXISTS(SELECT 1 FROM public.faculty_heads WHERE id=fixture) OR EXISTS(SELECT 1 FROM public.core_committees WHERE id=fixture) OR EXISTS(SELECT 1 FROM public.core_team_members WHERE id BETWEEN fixture-2 AND fixture) THEN RAISE EXCEPTION 'Hidden fixture exposed to a visitor'; END IF;
    BEGIN
      INSERT INTO public.core_committees(id,name,description) VALUES(fixture-10,'Denied visitor write','');
      RAISE EXCEPTION 'Anonymous database insert was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','iat',extract(epoch from now())::bigint+1)::text,true);
    IF EXISTS(SELECT 1 FROM public.faculty_heads WHERE id=fixture) OR EXISTS(SELECT 1 FROM public.core_team_members WHERE id BETWEEN fixture-2 AND fixture) THEN RAISE EXCEPTION 'Hidden fixture exposed to a non-admin user'; END IF;
    BEGIN
      INSERT INTO public.core_committees(id,name,description) VALUES(fixture-11,'Denied student write','');
      RAISE EXCEPTION 'Non-admin database insert was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','iat',extract(epoch from now())::bigint+1)::text,true);
    DELETE FROM public.core_committees WHERE id=fixture;
    SELECT count(*) INTO seen FROM public.core_team_members WHERE id BETWEEN fixture-2 AND fixture AND committee_id IS NULL;
    IF seen<>3 THEN RAISE EXCEPTION 'Deleting a department did not preserve all three profiles'; END IF;
    DELETE FROM public.faculty_heads WHERE id=fixture;
    DELETE FROM public.core_team_members WHERE id BETWEEN fixture-2 AND fixture;
    -- Roll back every fixture and its audit side effects even though assertions passed.
    RAISE EXCEPTION USING ERRCODE='RF001',MESSAGE='Scoped fixture rollback';
  EXCEPTION WHEN SQLSTATE 'RF001' THEN NULL; END;
END $$;
SELECT jsonb_build_object('ownerCreateUpdateReloadDelete',true,'phoneBatchAndCouncilColor',true,'visitorAndStudentVisibility',true,'visitorAndStudentWritesDenied',true,'departmentDeletePreservesProfiles',true,'allFixturesRolledBack',true) AS verification;
