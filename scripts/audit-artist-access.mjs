/** Read-only by default. Explicit flags apply the migration or run rolled-back probes. No credentials are reported. */
import {loadEnv} from 'vite';
import {writeFile,readFile} from 'node:fs/promises';
import {artistAccessProbe} from './diagnostics/artist-access-probes.mjs';

const env=loadEnv('production',process.cwd(),'');
const endpoint=env.VITE_SUPABASE_URL||env.SUPABASE_URL;
if(!endpoint||!env.SUPABASE_ACCESS_TOKEN)throw new Error('Configured Supabase project and management access are required.');
const project=new URL(endpoint).hostname.split('.')[0];
async function sql(query,readOnly=true){
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:readOnly}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw new Error(`Supabase artist audit failed (${response.status}): ${data.message||'request failed'}`);return data;
}
if(process.argv.includes('--apply-access'))await sql(await readFile(new URL('../supabase/migrations/20261124200000_artist_access_and_buckets.sql',import.meta.url),'utf8'),false);
let roleChecks;
if(process.argv.includes('--verify-roles')){const probe=artistAccessProbe();await sql(probe.query,false);const [leftover]=await sql(`SELECT (SELECT count(*) FROM guest_artists WHERE name='${probe.marker}')+(SELECT count(*) FROM admin_users WHERE email LIKE '${probe.marker}%')+(SELECT count(*) FROM storage.objects WHERE name LIKE '${probe.marker}%') remaining`);if(Number(leftover.remaining)!==0)throw new Error('Role probe cleanup failed');roleChecks={...Object.fromEntries(probe.checks.map(name=>[name,true])),rolledBack:true};}
const query=`SELECT jsonb_build_object(
 'rls',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity,'forced',c.relforcerowsecurity)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' AND c.relname IN('guest_artists','homepage_settings')) OR (n.nspname='storage' AND c.relname='objects')),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit,'mime',allowed_mime_types)) FROM storage.buckets WHERE id IN('guest-artist-images','guest-artist-videos','guest-artist-audio')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'mode',permissive,'roles',roles,'command',cmd,'using',qual,'check',with_check)) FROM pg_policies WHERE (schemaname='public' AND tablename IN('guest_artists','homepage_settings')) OR (schemaname='storage' AND tablename='objects')),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid))) FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass),
 'helpers',(SELECT jsonb_object_agg(p.proname,pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('current_admin_access','admin_can_manage_pages','admin_is_owner','session_is_current','can_manage_storage_bucket','can_write_storage_object','can_edit_site_settings','save_artist_stage_settings')),
 'adminColumns',(SELECT jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable)) FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users'),
 'artistTriggers',(SELECT jsonb_agg(pg_get_triggerdef(oid)) FROM pg_trigger WHERE tgrelid='public.guest_artists'::regclass AND NOT tgisinternal),
 'testArtifacts',(SELECT count(*) FROM public.guest_artists WHERE name LIKE '__rico_artist_smoke_%' OR name LIKE '__artist_rls_%')+(SELECT count(*) FROM storage.objects WHERE name LIKE '__workspace_diagnostics__/__rico_artist_smoke_%' OR name LIKE '__artist_rls_%'),
 'lineupRefreshSignal',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.guest_artists'::regclass AND tgname='artist_lineup_changed' AND tgenabled<>'D') AND EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='homepage_settings'),
 'realtime',EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='guest_artists')
) AS report`;
const globalResponse=await fetch(`https://api.supabase.com/v1/projects/${project}/config/storage`,{headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`},signal:AbortSignal.timeout(20000)});
if(!globalResponse.ok)throw new Error(`Storage global limit check failed (${globalResponse.status})`);
const globalConfig=await globalResponse.json();
const [row]=await sql(query);
await writeFile('/private/tmp/ricorrenza-artist-access.json',JSON.stringify(row.report,null,2),{mode:0o600});
const checks={rowSecurity:row.report.rls.every(table=>table.enabled),publishedReadGuard:row.report.policies.some(policy=>policy.name==='artist_published_read_guard'),artistWriteGuards:row.report.policies.filter(policy=>policy.name.startsWith('artist_scope_')).length===3,bucketWriteGuards:row.report.policies.filter(policy=>policy.name.startsWith('artist_bucket_')).length===3,stageSettingsRpc:!!row.report.helpers.save_artist_stage_settings,realtime:row.report.realtime,lineupRefreshSignal:row.report.lineupRefreshSignal};
checks.bucketLimits=row.report.buckets.length===3&&row.report.buckets.every(bucket=>bucket.public&&bucket.limit===({'guest-artist-images':50,'guest-artist-videos':50,'guest-artist-audio':25}[bucket.id])*1024*1024);
checks.globalUploadLimit=Number(globalConfig.fileSizeLimit)>=Math.max(...row.report.buckets.map(bucket=>bucket.limit));
checks.bucketMimeTypes=row.report.buckets.every(bucket=>bucket.mime.length>0&&bucket.mime.every(type=>type.startsWith(bucket.id==='guest-artist-images'?'image/':bucket.id==='guest-artist-videos'?'video/':'audio/')&&!type.includes('svg')));
checks.noTestArtifacts=Number(row.report.testArtifacts)===0;
const result={checks,globalFileSizeLimit:globalConfig.fileSizeLimit,buckets:row.report.buckets,roleChecks,ok:Object.values(checks).every(Boolean)};
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
