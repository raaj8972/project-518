import {randomUUID,randomInt} from 'node:crypto';

/** Tests real policies/helpers in one transaction; no identity or row is committed.
 * Storage DELETE uses the separate HTTP smoke test: Supabase forbids direct SQL deletes. */
export function artistAccessProbe(){
 const marker=`__artist_rls_${randomUUID()}`;
 const actors=Object.fromEntries(['owner','artist','other','legacy','student'].map(name=>[name,randomUUID()]));
 const base=-randomInt(10000000,90000000),hidden=base,published=base-1;
 const quote=value=>`'${String(value).replaceAll("'","''")}'`;
 const claims=(role,id='')=>id===actors.owner?`RESET ROLE;SELECT set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(SELECT user_id FROM public.admin_users WHERE role='owner' OR is_primary LIMIT 1),'iat',extract(epoch FROM now())::bigint,'aal','aal2')::text,true);SET LOCAL ROLE authenticated;`:`RESET ROLE;SELECT set_config('request.jwt.claims',${quote(JSON.stringify({role,sub:id||undefined,iat:Math.floor(Date.now()/1000),aal:'aal2'}))},true);SET LOCAL ROLE ${role};`;
 const fixture=(id,name,enabled)=>`INSERT INTO public.guest_artists(id,name,title,image,description,specialty,enabled) OVERRIDING SYSTEM VALUE VALUES(${id},${quote(name)},'Audit','https://example.invalid/audit.webp','Rolled-back access verification','Audit',${enabled});`;
 let query=`BEGIN;
 CREATE FUNCTION pg_temp.artist_assert_count(statement text,wanted integer) RETURNS void LANGUAGE plpgsql AS $fn$
 DECLARE actual integer;BEGIN EXECUTE statement INTO actual;IF actual<>wanted THEN RAISE EXCEPTION 'Artist policy count mismatch: expected %, got %',wanted,actual;END IF;END $fn$;
 CREATE FUNCTION pg_temp.artist_assert_denied(statement text) RETURNS void LANGUAGE plpgsql AS $fn$
 DECLARE blocked boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN insufficient_privilege THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Artist operation unexpectedly allowed';END IF;END $fn$;
 CREATE FUNCTION pg_temp.artist_assert_changed(statement text,wanted integer) RETURNS void LANGUAGE plpgsql AS $fn$
 DECLARE actual integer;BEGIN EXECUTE statement;GET DIAGNOSTICS actual=ROW_COUNT;IF actual<>wanted THEN RAISE EXCEPTION 'Artist policy write mismatch: expected %, got %',wanted,actual;END IF;END $fn$;
 GRANT EXECUTE ON FUNCTION pg_temp.artist_assert_count(text,integer),pg_temp.artist_assert_denied(text),pg_temp.artist_assert_changed(text,integer) TO anon,authenticated;
 `;
 for(const name of ['artist','other','legacy']){
  query+=`INSERT INTO public.admin_users(user_id,email,role,is_primary) VALUES(${quote(actors[name])},${quote(`${marker}-${name}@example.invalid`)},${quote(name==='owner'?'owner':'admin')},false);`;
  query+=`INSERT INTO public.admin_permissions(user_id,email,allowed_pages,page_access_configured,can_guest_artists) VALUES(${quote(actors[name])},${quote(`${marker}-${name}@example.invalid`)},${name==='artist'?"ARRAY['guest-artists']":name==='other'?"ARRAY['band']":"'{}'::text[]"},${name!=='legacy'},${name==='legacy'});`;
 }
 query+=fixture(hidden,marker,false)+fixture(published,marker,true);
 for(const bucket of ['guest-artist-images','guest-artist-videos','guest-artist-audio'])query+=`INSERT INTO storage.objects(bucket_id,name)VALUES('${bucket}','${marker}/protected');`;
 for(const [name,role,id] of [['anonymous','anon',''],['student','authenticated',actors.student],['other','authenticated',actors.other]]){
  query+=claims(role,id);
  query+=`SELECT pg_temp.artist_assert_count(${quote(`SELECT count(*)::integer FROM public.guest_artists WHERE id IN(${hidden},${published})`)},1);`;
  query+=`SELECT pg_temp.artist_assert_denied(${quote(fixture(base-2,marker,false))});`;
  query+=`SELECT pg_temp.artist_assert_changed(${quote(`UPDATE public.guest_artists SET title='Blocked' WHERE id=${published}`)},0);SELECT pg_temp.artist_assert_changed(${quote(`DELETE FROM public.guest_artists WHERE id=${published}`)},0);`;
  if(role==='authenticated')query+=`SELECT pg_temp.artist_assert_denied($q$SELECT public.save_artist_stage_settings('{"visible_years":[2026],"date_label":"TEST","venue_label":"TEST","lights_enabled":true,"beat_sync":true}'::jsonb)$q$);`;
  for(const bucket of ['guest-artist-images','guest-artist-videos','guest-artist-audio'])query+=`SELECT pg_temp.artist_assert_denied(${quote(`INSERT INTO storage.objects(bucket_id,name)VALUES('${bucket}','${marker}/${name}')`)});SELECT pg_temp.artist_assert_changed(${quote(`UPDATE storage.objects SET name='${marker}/blocked' WHERE bucket_id='${bucket}' AND name='${marker}/protected'`)},0);`;
 }
 for(const name of ['artist','legacy','owner']){
  query+=claims('authenticated',actors[name]);
  query+=`SELECT pg_temp.artist_assert_count(${quote(`SELECT count(*)::integer FROM public.guest_artists WHERE id IN(${hidden},${published})`)},2);`;
  query+=fixture(base-2,marker,false)+`SELECT pg_temp.artist_assert_changed(${quote(`UPDATE public.guest_artists SET title='Verified' WHERE id=${base-2}`)},1);SELECT pg_temp.artist_assert_changed(${quote(`DELETE FROM public.guest_artists WHERE id=${base-2}`)},1);`;
  for(const bucket of ['guest-artist-images','guest-artist-videos','guest-artist-audio'])query+=`INSERT INTO storage.objects(bucket_id,name)VALUES('${bucket}','${marker}/${name}');SELECT pg_temp.artist_assert_changed(${quote(`UPDATE storage.objects SET name='${marker}/${name}-updated' WHERE bucket_id='${bucket}' AND name='${marker}/${name}'`)},1);`;
  query+=`SELECT public.save_artist_stage_settings('{"visible_years":[2026,2024],"date_label":"TEST","venue_label":"TEST","lights_enabled":true,"beat_sync":true}'::jsonb);`;
  if(name!=='owner')query+=`SELECT pg_temp.artist_assert_changed('UPDATE public.homepage_settings SET brand_year=2099 WHERE id=1',0);`;
 }
 query+=`RESET ROLE;INSERT INTO public.revoked_admin_accounts(user_id,email)VALUES(${quote(actors.artist)},${quote(`${marker}-artist@example.invalid`)});`+claims('authenticated',actors.artist);
 query+=`SELECT pg_temp.artist_assert_count(${quote(`SELECT count(*)::integer FROM public.guest_artists WHERE id IN(${hidden},${published})`)},0);SELECT pg_temp.artist_assert_denied(${quote(fixture(base-2,marker,false))});SELECT pg_temp.artist_assert_denied($q$SELECT public.save_artist_stage_settings('{}'::jsonb)$q$);RESET ROLE;ROLLBACK;`;
 return {query,marker,checks:['anonymousPublishedOnly','studentPublishedOnly','otherAdminPublishedOnly','unassignedWritesDenied','artistCrud','legacyFlagCrud','ownerCrud','bucketInsertUpdateScopes','stageSettingsRpc','noGeneralHomepageWrite','revokedSessionDenied']};
}
