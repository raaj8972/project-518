import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Read-only by default. Optional probes use only new temporary files / rolled-back rows.
const env=loadEnv('production',process.cwd(),'');
const url=env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anonKey=env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
if(!url || !anonKey || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Rico Family audit requires the configured Supabase URL, anon key and server service key.');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(target,init)=>fetch(target,{...init,signal:AbortSignal.timeout(20000)})}};
const db=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,options),anon=createClient(url,anonKey,options);
const tables={
 faculty_heads:'id,name,title,image,description,achievements,email,phone,social_links,enabled,order_position,created_at,updated_at',
 core_committees:'id,name,description,color,is_core,enabled,order_position,created_at,updated_at',
 core_team_members:'id,name,image,role,description,specialty,achievements,email,phone,social_links,is_head,is_council,color,committee_id,enabled,order_position,created_at,updated_at',
};
const report={checkedAt:new Date().toISOString(),scope:'Rico Family',sameConfiguredProject:(env.SUPABASE_URL || url).replace(/\/$/,'')===url.replace(/\/$/,''),tables:{},buckets:{}};
const images=[];
await Promise.all(Object.entries(tables).map(async([table,columns])=>{
 const [admin,visitor]=await Promise.all([db.from(table).select(columns,{count:'exact'}),anon.from(table).select('id,enabled',{count:'exact'})]);
 report.tables[table]={columnsValid:!admin.error,adminReadError:admin.error?.message || null,adminCount:admin.count,visitorReadError:visitor.error?.message || null,visitorCount:visitor.count,hiddenRowsExposed:visitor.data?.filter(row=>!row.enabled).length || 0};
 for(const row of admin.data || [])if(row.image)images.push(row.image);
}));
await Promise.all(['team-images','faculty-images'].map(async bucket=>{
 const result=await db.storage.getBucket(bucket);
 report.buckets[bucket]=result.error?{error:result.error.message}:{public:result.data.public,fileSizeLimit:result.data.file_size_limit,allowedMimeTypes:result.data.allowed_mime_types};
}));
const downloads=await Promise.all(images.map(async image=>{try{const response=await fetch(image,{method:'HEAD',signal:AbortSignal.timeout(15000)});return response.ok;}catch{return false;}}));
report.images={total:downloads.length,healthy:downloads.filter(Boolean).length};

async function sql(query,readOnly=true){
 if(!env.SUPABASE_ACCESS_TOKEN)throw new Error('The Supabase Management API token is required for database metadata / rollback checks.');
 const ref=new URL(url).hostname.split('.')[0];
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:readOnly}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw new Error(data.message || 'Supabase metadata check failed.');return data;
}
if(env.SUPABASE_ACCESS_TOKEN){
 const result=await sql(`select jsonb_build_object(
 'rls',(select jsonb_object_agg(relname,relrowsecurity) from pg_class where relnamespace='public'::regnamespace and relname in ('faculty_heads','core_committees','core_team_members')),
 'realtime',(select jsonb_agg(tablename) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in ('faculty_heads','core_committees','core_team_members')),
 'departmentDeletePreservesProfiles',(select bool_and(confdeltype='n') from pg_constraint where conrelid='public.core_team_members'::regclass and confrelid='public.core_committees'::regclass and contype='f'),
 'photoWriteGuards',(select count(*) from pg_policies where schemaname='storage' and tablename='objects' and permissive='RESTRICTIVE' and policyname like 'rico_family_%'),
 'visibilityGuards',(select count(*) from pg_policies where schemaname='public' and tablename in ('faculty_heads','core_committees','core_team_members') and permissive='RESTRICTIVE' and policyname in ('rico_family_visitor_visibility','rico_family_signed_in_visibility'))
 ) as checks;`);
 report.database=result[0]?.checks;
}
if(process.argv.includes('--verify-writes')){
 const query=await readFile(new URL('../supabase/tests/rico_family_live_check.sql',import.meta.url),'utf8');
 report.writeVerification=(await sql(query,false))[0]?.verification;
}
if(process.argv.includes('--probe-storage')){
 report.storageProbes=[];
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=','base64');
 for(const bucket of ['team-images','faculty-images']){
  const path=`rico-family-audit/${randomUUID()}.png`, deniedPath=`rico-family-audit/${randomUUID()}-denied.png`;
  const probe={bucket,upload:false,publicDownload:false,anonymousUploadDenied:false,anonymousUpdateDenied:false,anonymousDeleteDenied:false,cleanedUp:false};
  const created=[];
  try{
   const upload=await db.storage.from(bucket).upload(path,png,{contentType:'image/png',upsert:false});if(upload.error)throw new Error(upload.error.message);created.push(path);probe.upload=true;
   const download=await fetch(db.storage.from(bucket).getPublicUrl(path).data.publicUrl,{signal:AbortSignal.timeout(15000)});probe.publicDownload=download.ok && (await download.arrayBuffer()).byteLength===png.byteLength;
   const denied=await anon.storage.from(bucket).upload(deniedPath,png,{contentType:'image/png',upsert:false});probe.anonymousUploadDenied=!!denied.error;if(!denied.error)created.push(deniedPath);
   const update=await anon.storage.from(bucket).update(path,png,{contentType:'image/png'});probe.anonymousUpdateDenied=!!update.error;
   await anon.storage.from(bucket).remove([path]);
   const listing=await db.storage.from(bucket).list('rico-family-audit',{search:path.split('/').pop(),limit:10});if(listing.error)throw new Error(listing.error.message);probe.anonymousDeleteDenied=listing.data.some(row=>row.name===path.split('/').pop());
  }catch(error){probe.error=error.message;}
  finally{if(created.length){const cleanup=await db.storage.from(bucket).remove(created);probe.cleanedUp=!cleanup.error;if(cleanup.error)probe.cleanupError=cleanup.error.message;}}
  report.storageProbes.push(probe);
 }
}
report.ok=report.sameConfiguredProject && Object.values(report.tables).every(table=>table.columnsValid&&!table.visitorReadError&&table.hiddenRowsExposed===0)
 &&Object.values(report.buckets).every(bucket=>!bucket.error&&bucket.public)&&report.images.total===report.images.healthy
 &&(!report.database || (Object.values(report.database.rls || {}).every(Boolean)&&report.database.realtime?.length===3&&report.database.departmentDeletePreservesProfiles&&report.database.photoWriteGuards===6&&report.database.visibilityGuards===6))
 &&(!report.writeVerification || Object.values(report.writeVerification).every(Boolean))
 &&(!report.storageProbes || report.storageProbes.every(probe=>!probe.error&&probe.upload&&probe.publicDownload&&probe.anonymousUploadDenied&&probe.anonymousUpdateDenied&&probe.anonymousDeleteDenied&&probe.cleanedUp));
await mkdir('tmp',{recursive:true});await writeFile('tmp/rico-family-supabase-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
