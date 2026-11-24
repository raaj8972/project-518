/** Explicit live smoke test: only this script's hidden dummy row and UUID-scoped files are removed. */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
const config=loadEnv('production',process.cwd(),'');
if(!process.argv.includes('--smoke-test'))throw new Error('Pass --smoke-test to upload temporary fixtures and create one hidden artist.');
const endpoint=config.VITE_SUPABASE_URL||config.SUPABASE_URL;
const client=createClient(endpoint,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const anonymous=createClient(endpoint,config.VITE_SUPABASE_ANON_KEY||config.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const marker=`__rico_artist_smoke_${randomUUID()}`;const uploaded=[];let createdId=null;const report={marker,bucketChecks:[],artistSave:false,readBack:false,cleanup:false,errors:[]};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const wav=Buffer.alloc(204);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const fixtures=[{bucket:'guest-artist-images',type:'image/png',extension:'png',bytes:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')},{bucket:'guest-artist-videos',type:'video/mp4',extension:'mp4',bytes:fs.readFileSync(path.resolve('public/hero-preview.mp4'))},{bucket:'guest-artist-audio',type:'audio/wav',extension:'wav',bytes:wav}];
try{
 const schema=await client.from('guest_artists').select('id,card_media_url,card_media_is_video,detail_music_url').limit(1);if(schema.error)throw new Error(schema.error.message);
 for(const fixture of fixtures){
  const key=`__workspace_diagnostics__/${marker}/fixture.${fixture.extension}`;
  const result=await client.storage.from(fixture.bucket).upload(key,fixture.bytes,{contentType:fixture.type,upsert:false,cacheControl:'0'});if(result.error)throw new Error(`${fixture.bucket}: ${result.error.message}`);uploaded.push({bucket:fixture.bucket,key});
  const url=client.storage.from(fixture.bucket).getPublicUrl(key).data?.publicUrl;assert(typeof url==='string'&&url.length>0,`${fixture.bucket}: missing public URL`);fixture.url=url;
  const downloaded=await client.storage.from(fixture.bucket).download(key);if(downloaded.error)throw new Error(`${fixture.bucket}: ${downloaded.error.message}`);assert(hash(Buffer.from(await downloaded.data.arrayBuffer()))===hash(fixture.bytes),`${fixture.bucket}: read-back bytes differ`);
  const publicRead=await fetch(url);assert(publicRead.ok,`${fixture.bucket}: public read returned ${publicRead.status}`);assert(hash(Buffer.from(await publicRead.arrayBuffer()))===hash(fixture.bytes),`${fixture.bucket}: public bytes differ`);
  const stream=await fetch(url,{headers:{Origin:'http://localhost:8082',Range:'bytes=0-31'}});assert(stream.headers.get('access-control-allow-origin')==='*','Artist media CORS header is missing');assert(stream.status===206&&stream.headers.get('content-range')?.startsWith('bytes 0-31/'),'Artist media range streaming failed');await stream.arrayBuffer();
  const blockedKey=`__workspace_diagnostics__/${marker}/anonymous.${fixture.extension}`;
  const anonymousUpload=await anonymous.storage.from(fixture.bucket).upload(blockedKey,fixture.bytes,{contentType:fixture.type,upsert:false});
  if(!anonymousUpload.error)uploaded.push({bucket:fixture.bucket,key:blockedKey});
  assert(anonymousUpload.error,`${fixture.bucket}: anonymous upload was allowed`);
  const overwrite=await anonymous.storage.from(fixture.bucket).update(key,fixture.bytes,{contentType:fixture.type});assert(overwrite.error,`${fixture.bucket}: anonymous overwrite was allowed`);
  await anonymous.storage.from(fixture.bucket).remove([key]);const stillThere=await client.storage.from(fixture.bucket).download(key);assert(!stillThere.error&&hash(Buffer.from(await stillThere.data.arrayBuffer()))===hash(fixture.bytes),`${fixture.bucket}: anonymous deletion removed the fixture`);
  const htmlKey=`__workspace_diagnostics__/${marker}/rejected.html`;const html=await client.storage.from(fixture.bucket).upload(htmlKey,Buffer.from('<p>rejected fixture</p>'),{contentType:'text/html',upsert:false});if(!html.error)uploaded.push({bucket:fixture.bucket,key:htmlKey});assert(html.error,`${fixture.bucket}: HTML was accepted`);
  report.bucketChecks.push({bucket:fixture.bucket,bytes:fixture.bytes.length,upload:true,readBack:true,publicRead:true,cors:true,rangeStreaming:true,anonymousUploadBlocked:true,anonymousOverwriteBlocked:true,anonymousDeleteBlocked:true,htmlBlocked:true});
 }
 const payload={name:marker,title:'Temporary save verification',image:fixtures[0].url,description:'Hidden diagnostic artist; removed after the read-back check.',specialty:'Diagnostic',achievements:[],social_links:{instagram:'',youtube:'',spotify:''},order_position:1,enabled:false,is_featured:true,video_url:fixtures[1].url,youtube_url:'',watch_live_url:'',card_media_url:fixtures[1].url,card_media_is_video:true,detail_music_url:fixtures[2].url,performance_at:null,venue:'Audit stage',countdown_enabled:false,live_now_enabled:true,festival_year:2025,artist_kind:'band',gallery_images:[fixtures[0].url],stage_media_mode:'clips',stage_clip_urls:[fixtures[1].url],stage_clip_seconds:60,desktop_gallery_images:[fixtures[0].url],desktop_stage_clip_urls:[fixtures[1].url],stage_light_color:'#54cbb0',track_title:'Smoke track',spotify_collection_url:'https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx',featured_songs:[{title:'Fixture song',url:'https://youtu.be/aqz-KE-bpKQ'}]};
 const inserted=await client.from('guest_artists').insert(payload).select('id').single();if(inserted.error)throw new Error(inserted.error.message);createdId=inserted.data?.id;assert(createdId!=null,'Save did not return an artist ID');report.artistSave=true;
 const read=await client.from('guest_artists').select('*').eq('id',createdId).single();if(read.error)throw new Error(read.error.message);const row=read.data;
 assert(row&&row.name===marker&&row.enabled===false&&row.is_featured===true,'Saved artist flags or identity differ');assert(Array.isArray(row.achievements)&&row.social_links&&typeof row.social_links==='object','Saved list/social objects are null');for(const field of ['image','video_url','card_media_url','detail_music_url'])assert(typeof row[field]==='string'&&row[field]===payload[field],`${field} did not round-trip`);for(const field of ['festival_year','artist_kind','gallery_images','stage_media_mode','stage_clip_urls','stage_clip_seconds','desktop_gallery_images','desktop_stage_clip_urls','stage_light_color','track_title','spotify_collection_url','featured_songs'])assert(isDeepStrictEqual(row[field],payload[field]),`${field} did not round-trip`);const hidden=await anonymous.from('guest_artists').select('id').eq('id',createdId);assert(!hidden.error&&hidden.data?.length===0,'Hidden artist was visible to anonymous readers');report.hiddenArtistProtected=true;report.readBack=true;
}catch(error){report.errors.push(error.message);}
finally{
 if(createdId!=null){const deleted=await client.from('guest_artists').delete().eq('id',createdId).eq('name',marker).select('id');if(deleted.error||deleted.data?.length!==1)report.errors.push('Dummy artist cleanup failed');}
 for(const file of uploaded){const removed=await client.storage.from(file.bucket).remove([file.key]);if(removed.error)report.errors.push(`${file.bucket}: fixture cleanup failed`);else{const prefix=file.key.substring(0,file.key.lastIndexOf('/'));const name=file.key.substring(file.key.lastIndexOf('/')+1);const remaining=await client.storage.from(file.bucket).list(prefix,{search:name});if(remaining.error||remaining.data?.some(item=>item.name===name))report.errors.push(`${file.bucket}: fixture cleanup failed`);}}
 const remaining=await client.from('guest_artists').select('id').eq('name',marker);report.cleanup=!remaining.error&&remaining.data?.length===0&&!report.errors.some(message=>message.includes('cleanup'));
}
fs.writeFileSync('/tmp/ricorrenza-guest-artist-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.errors.length||!report.artistSave||!report.cleanup)process.exitCode=1;
