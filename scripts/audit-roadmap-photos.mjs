import {loadEnv} from 'vite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {chroniclesAccessProbe} from './diagnostics/chronicles-access-probes.mjs';

const env=loadEnv('production',process.cwd(),'');
const url=env.VITE_SUPABASE_URL||env.SUPABASE_URL;
if(!url||!env.SUPABASE_ACCESS_TOKEN)throw new Error('Configured Supabase URL and management access are required.');
const ref=new URL(url).hostname.split('.')[0];
async function sql(query,readOnly=true){
  const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{
    method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({query,read_only:readOnly}),signal:AbortSignal.timeout(30000),
  });
  const data=await response.json();if(!response.ok)throw new Error(data.message||`Timeline database operation failed (${response.status}).`);return data;
}
if(process.argv.includes('--apply')) {
 for(const file of ['20261115000001_roadmap_photos.sql','20261125100000_chronicles_access.sql'])
  await sql(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'),false);
}
const metadata=await sql(`select jsonb_build_object(
 'photosColumn',exists(select 1 from information_schema.columns where table_schema='public' and table_name='roadmap_milestones' and column_name='images' and data_type='ARRAY'),
 'photoBucket',exists(select 1 from storage.buckets where id='roadmap-images' and public=true),
 'bucketFileLimits',exists(select 1 from storage.buckets where id='roadmap-images' and file_size_limit=31457280),
 'bucketMimeTypes',exists(select 1 from storage.buckets where id='roadmap-images' and allowed_mime_types @> ARRAY['image/jpeg','image/png','image/webp','image/avif'] and not ('image/svg+xml'=any(allowed_mime_types))),
 'photoWriteGuards',(select count(*)=6 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'roadmap_photos_%' and permissive='RESTRICTIVE'),
 'timelineRls',(select relrowsecurity from pg_class where oid='public.roadmap_milestones'::regclass),
 'storageRls',(select relrowsecurity from pg_class where oid='storage.objects'::regclass),
 'tableWriteGuards',(select count(*)=3 from pg_policies where schemaname='public' and tablename='roadmap_milestones' and policyname like 'chronicles_scope_%' and permissive='RESTRICTIVE'),
 'storageGuardMapped',(select position('roadmap-images' in pg_get_functiondef('public.can_write_storage_object(text,text)'::regprocedure))>0),
 'realtime',exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='roadmap_milestones'),
 'timelineRead',(select count(*)>=0 from public.roadmap_milestones)
 ) as checks`);
const report={database:metadata[0].checks};
if(process.argv.includes('--verify-roles')) {
 const probe=chroniclesAccessProbe();await sql(probe.query,false);
 const [cleanup]=await sql(`select (select count(*) from public.roadmap_milestones where title='${probe.marker}')+(select count(*) from storage.objects where name like '${probe.marker}%')+(select count(*) from public.admin_users where email like '${probe.marker}%') remaining`);
 if(Number(cleanup.remaining)!==0)throw new Error('Chronicles role probe did not clean up');
 report.roles={anonymousWritesDenied:true,studentWritesDenied:true,unassignedAdminWritesDenied:true,assignedAdminCrud:true,ownerCrud:true,storageUploadAndUpdateScopes:true,revokedAdminDenied:true,rolledBack:true};
}
if(process.argv.includes('--verify')){
  await sql(`BEGIN; DO $$ DECLARE probe_id bigint; stored text[]; BEGIN
    INSERT INTO public.roadmap_milestones(year,title,points,enabled,images) VALUES(2999,'[temporary timeline photo verification]',ARRAY['Probe'],false,ARRAY['https://example.invalid/one.webp','https://example.invalid/two.webp']) RETURNING id INTO probe_id;
    SELECT images INTO stored FROM public.roadmap_milestones WHERE id=probe_id;
    IF array_length(stored,1)<>2 THEN RAISE EXCEPTION 'Multiple photos were not saved'; END IF;
    UPDATE public.roadmap_milestones SET images=ARRAY['https://example.invalid/replaced.webp'] WHERE id=probe_id;
    SELECT images INTO stored FROM public.roadmap_milestones WHERE id=probe_id;
    IF stored<>ARRAY['https://example.invalid/replaced.webp'] THEN RAISE EXCEPTION 'Replacement was not saved'; END IF;
    UPDATE public.roadmap_milestones SET images='{}' WHERE id=probe_id;
    IF EXISTS(SELECT 1 FROM public.roadmap_milestones WHERE id=probe_id AND cardinality(images)<>0) THEN RAISE EXCEPTION 'Photo removal was not saved'; END IF;
    DELETE FROM public.roadmap_milestones WHERE id=probe_id;
  END $$; ROLLBACK;`,false);
  report.rolledBackPhotoCrud=true;
  if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('The configured service key is required for a disposable storage probe.');
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(target,init)=>fetch(target,{...init,signal:AbortSignal.timeout(20000)})}};
  const admin=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,options),anon=createClient(url,env.VITE_SUPABASE_ANON_KEY||env.SUPABASE_ANON_KEY,options);
  const path=`_verification/${randomUUID()}.png`,deniedPath=`_verification/${randomUUID()}-denied.png`;
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=','base64');
  const files=[];report.storage={};
  try{
    const upload=await admin.storage.from('roadmap-images').upload(path,png,{contentType:'image/png'});if(upload.error)throw new Error(upload.error.message);files.push(path);report.storage.upload=true;
    const response=await fetch(admin.storage.from('roadmap-images').getPublicUrl(path).data.publicUrl,{signal:AbortSignal.timeout(20000)});
    report.storage.publicRead=response.ok&&(await response.arrayBuffer()).byteLength===png.byteLength;
    const rejected=await admin.storage.from('roadmap-images').upload(path+'.svg',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),{contentType:'image/svg+xml'});
    report.storage.svgRejected=!!rejected.error;if(!rejected.error)files.push(path+'.svg');
    const update=await anon.storage.from('roadmap-images').update(path,png,{contentType:'image/png'});report.storage.visitorUpdateDenied=!!update.error;
    await anon.storage.from('roadmap-images').remove([path]);
    const stillPresent=await admin.storage.from('roadmap-images').download(path);report.storage.visitorDeleteDenied=!stillPresent.error;
    const denied=await anon.storage.from('roadmap-images').upload(deniedPath,png,{contentType:'image/png'});report.storage.visitorUploadDenied=!!denied.error;if(!denied.error)files.push(deniedPath);
  }finally{const cleanup=await admin.storage.from('roadmap-images').remove(files);report.storage.cleanedUp=!cleanup.error;if(cleanup.error)throw new Error(cleanup.error.message);}
}
report.ok=Object.values(report.database).every(Boolean)&&(!report.storage||Object.values(report.storage).every(Boolean));
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
