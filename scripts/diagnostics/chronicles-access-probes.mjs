import {randomUUID,randomInt} from 'node:crypto';

// All fixtures, role changes and object metadata roll back together.
export function chroniclesAccessProbe() {
 const marker=`__chronicles_rls_${randomUUID()}`;
 const ids=Object.fromEntries(['assigned','other','student'].map(name=>[name,randomUUID()]));
 const id=-randomInt(10000000,90000000);
 const q=value=>`'${String(value).replaceAll("'","''")}'`;
 const claims=(role,actor)=>`RESET ROLE;SELECT set_config('request.jwt.claims',jsonb_build_object('role',${q(role)},'sub',${actor==='owner'?"(SELECT user_id FROM public.admin_users WHERE role='owner' OR is_primary LIMIT 1)":ids[actor]?q(ids[actor]):'NULL'},'iat',extract(epoch FROM now())::bigint,'aal','aal2')::text,true);SET LOCAL ROLE ${role};`;
 const row=`INSERT INTO public.roadmap_milestones(id,year,title,images,enabled) VALUES(${id},2998,${q(marker)},ARRAY['https://example.invalid/probe.webp'],false)`;
 const insert=`INSERT INTO storage.objects(bucket_id,name) VALUES('roadmap-images',${q(marker+'/photo.webp')})`;
 let query=`BEGIN;
 CREATE FUNCTION pg_temp.chronicles_denied(statement text) RETURNS void LANGUAGE plpgsql AS $f$
 DECLARE blocked boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN insufficient_privilege THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Chronicles operation unexpectedly allowed';END IF;END $f$;
 CREATE FUNCTION pg_temp.chronicles_changed(statement text,wanted integer) RETURNS void LANGUAGE plpgsql AS $f$
 DECLARE actual integer;BEGIN EXECUTE statement;GET DIAGNOSTICS actual=ROW_COUNT;IF actual<>wanted THEN RAISE EXCEPTION 'Chronicles changed %, expected %',actual,wanted;END IF;END $f$;
 GRANT EXECUTE ON FUNCTION pg_temp.chronicles_denied(text),pg_temp.chronicles_changed(text,integer) TO anon,authenticated;
 `;
 for(const actor of ['assigned','other']) query+=`INSERT INTO public.admin_users(user_id,email,role,is_primary) VALUES(${q(ids[actor])},${q(marker+actor+'@example.invalid')},'admin',false);INSERT INTO public.admin_permissions(user_id,email,allowed_pages,page_access_configured) VALUES(${q(ids[actor])},${q(marker+actor+'@example.invalid')},ARRAY[${q(actor==='assigned'?'roadmap':'band')}],true);`;
 query+=row+';'+insert+';';
 for(const [role,actor] of [['anon','anonymous'],['authenticated','student'],['authenticated','other']]) {
  query+=claims(role,actor);
  query+=`SELECT pg_temp.chronicles_denied(${q(row.replace(String(id),String(id-1)))});SELECT pg_temp.chronicles_changed(${q(`UPDATE public.roadmap_milestones SET title='Denied' WHERE id=${id}`)},0);SELECT pg_temp.chronicles_changed(${q(`DELETE FROM public.roadmap_milestones WHERE id=${id}`)},0);SELECT pg_temp.chronicles_denied(${q(insert.replace('photo.webp',actor+'.webp'))});SELECT pg_temp.chronicles_changed(${q(`UPDATE storage.objects SET name=${q(marker+'/blocked.webp')} WHERE bucket_id='roadmap-images' AND name=${q(marker+'/photo.webp')}`)},0);`;
 }
 for(const actor of ['assigned','owner']) {
  query+=claims('authenticated',actor);
  query+=row.replace(String(id),String(id-1))+';';
  query+=`SELECT pg_temp.chronicles_changed(${q(`UPDATE public.roadmap_milestones SET images=ARRAY['https://example.invalid/replaced.webp'] WHERE id=${id-1}`)},1);SELECT pg_temp.chronicles_changed(${q(`DELETE FROM public.roadmap_milestones WHERE id=${id-1}`)},1);`;
  query+=insert.replace('photo.webp',actor+'.webp')+';';
  query+=`SELECT pg_temp.chronicles_changed(${q(`UPDATE storage.objects SET name=${q(marker+'/'+actor+'-updated.webp')} WHERE bucket_id='roadmap-images' AND name=${q(marker+'/'+actor+'.webp')}`)},1);`;
 }
 query+=`RESET ROLE;INSERT INTO public.revoked_admin_accounts(user_id,email) VALUES(${q(ids.assigned)},${q(marker+'assigned@example.invalid')});`+claims('authenticated','assigned');
 query+=`SELECT pg_temp.chronicles_denied(${q(row.replace(String(id),String(id-1)))});SELECT pg_temp.chronicles_denied(${q(insert.replace('photo.webp','revoked.webp'))});RESET ROLE;ROLLBACK;`;
 return {query,marker};
}
