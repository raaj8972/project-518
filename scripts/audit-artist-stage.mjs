import {loadEnv} from 'vite';
import {readFile} from 'node:fs/promises';

const env=loadEnv('production',process.cwd(),'');
const endpoint=env.VITE_SUPABASE_URL||env.SUPABASE_URL;
if(!endpoint||!env.SUPABASE_ACCESS_TOKEN)throw new Error('Configured Supabase project URL and management token are required. No changes were made.');
const project=new URL(endpoint).hostname.split('.')[0];
async function sql(query,readOnly=true){
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:readOnly}),signal:AbortSignal.timeout(30000)});
 const result=await response.json();
 if(!response.ok)throw new Error(`Artist schema operation failed (${response.status}): ${result.message||'Database request failed'}`);
 return result;
}
if(process.argv.includes('--apply'))await sql(await readFile(new URL('../supabase/migrations/20261124120000_artist_stage_editions.sql',import.meta.url),'utf8'),false);
if(process.argv.includes('--apply-profiles'))await sql(await readFile(new URL('../supabase/migrations/20261124160000_artist_profiles_and_stage_clips.sql',import.meta.url),'utf8'),false);
if(process.argv.includes('--apply-display'))await sql(await readFile(new URL('../supabase/migrations/20261124180000_artist_stage_display_and_responsive_media.sql',import.meta.url),'utf8'),false);
const [metadata]=await sql(`SELECT jsonb_build_object(
 'editionColumn',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_artists' AND column_name='festival_year' AND data_type='integer'),
 'galleryColumn',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_artists' AND column_name='gallery_images' AND data_type='ARRAY'),
 'trackTitleColumn',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_artists' AND column_name='track_title'),
 'profileFields',(SELECT count(*)=6 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_artists' AND column_name IN ('artist_kind','stage_media_mode','stage_clip_urls','stage_clip_seconds','spotify_collection_url','featured_songs')),
 'displayFields',(SELECT count(*)=3 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_artists' AND column_name IN ('desktop_gallery_images','desktop_stage_clip_urls','stage_light_color')),
 'stageSettings',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='homepage_settings' AND column_name='artist_stage_settings'),
 'videoBucket',EXISTS(SELECT 1 FROM storage.buckets WHERE id='guest-artist-videos'),
 'rowSecurityEnabled',(SELECT relrowsecurity FROM pg_class WHERE oid='public.guest_artists'::regclass),
 'imageBucket',EXISTS(SELECT 1 FROM storage.buckets WHERE id='guest-artist-images'),
 'audioBucket',EXISTS(SELECT 1 FROM storage.buckets WHERE id='guest-artist-audio')
 ) AS checks`);
const report={database:metadata.checks};
if(process.argv.includes('--verify')){
 await sql(`BEGIN;
 DO $$ DECLARE probe_id bigint; saved public.guest_artists%ROWTYPE; BEGIN
 INSERT INTO public.guest_artists(name,title,image,description,specialty,enabled,festival_year,gallery_images,track_title,detail_music_url)
 VALUES('[temporary artist stage verification]','Test','https://example.invalid/portrait.webp','Rolled back verification','Test',false,2025,ARRAY['https://example.invalid/one.webp','https://example.invalid/two.webp','https://example.invalid/three.webp'],'Selected track','https://example.invalid/song.mp3') RETURNING id INTO probe_id;
 SELECT * INTO saved FROM public.guest_artists WHERE id=probe_id;
 IF saved.festival_year<>2025 OR cardinality(saved.gallery_images)<>3 OR saved.track_title<>'Selected track' OR saved.enabled THEN RAISE EXCEPTION 'Artist stage insert mismatch'; END IF;
 UPDATE public.guest_artists SET festival_year=2026,gallery_images=ARRAY['https://example.invalid/replaced.webp'],track_title='Replaced track' WHERE id=probe_id;
 SELECT * INTO saved FROM public.guest_artists WHERE id=probe_id;
 IF saved.festival_year<>2026 OR cardinality(saved.gallery_images)<>1 OR saved.track_title<>'Replaced track' THEN RAISE EXCEPTION 'Artist stage update mismatch'; END IF;
 UPDATE public.guest_artists SET gallery_images='{}' WHERE id=probe_id;
 IF EXISTS(SELECT 1 FROM public.guest_artists WHERE id=probe_id AND cardinality(gallery_images)<>0) THEN RAISE EXCEPTION 'Gallery removal mismatch'; END IF;
 END $$;
 ROLLBACK;`,false);
 await sql(`BEGIN;
 DO $$ DECLARE probe_id bigint; saved public.guest_artists%ROWTYPE; BEGIN
 INSERT INTO public.guest_artists(name,title,image,description,specialty,enabled,festival_year,artist_kind,stage_media_mode,stage_clip_urls,stage_clip_seconds,spotify_collection_url,featured_songs)
 VALUES('[temporary artist stage verification]','Live band','https://example.invalid/band.webp','Profile verification','Fusion',false,2026,'band','clips',ARRAY['https://example.invalid/one.mp4','https://example.invalid/two.mp4'],60,'https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx','[{"title":"Sample song","url":"https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ"}]'::jsonb) RETURNING id INTO probe_id;
 SELECT * INTO saved FROM public.guest_artists WHERE id=probe_id;
 IF saved.artist_kind<>'band' OR saved.stage_media_mode<>'clips' OR cardinality(saved.stage_clip_urls)<>2 OR saved.stage_clip_seconds<>60 OR jsonb_array_length(saved.featured_songs)<>1 THEN RAISE EXCEPTION 'Artist profile insert mismatch'; END IF;
 UPDATE public.guest_artists SET stage_media_mode='photos',stage_clip_urls='{}',stage_clip_seconds=30,featured_songs='[]',spotify_collection_url='' WHERE id=probe_id;
 SELECT * INTO saved FROM public.guest_artists WHERE id=probe_id;
 IF saved.stage_media_mode<>'photos' OR cardinality(saved.stage_clip_urls)<>0 OR jsonb_array_length(saved.featured_songs)<>0 THEN RAISE EXCEPTION 'Artist profile update mismatch'; END IF;
 END $$;
 ROLLBACK;`,false);
 await sql(`BEGIN;DO $$ DECLARE settings jsonb; probe_id bigint; BEGIN
 settings='{"visible_years":[2026,2023],"date_label":"DEC 2026","venue_label":"Main stage","lights_enabled":true,"beat_sync":true}'::jsonb;
 UPDATE homepage_settings SET artist_stage_settings=settings WHERE id=1;
 IF NOT EXISTS(SELECT 1 FROM homepage_settings WHERE id=1 AND artist_stage_settings=settings) THEN RAISE EXCEPTION 'Stage settings save mismatch';END IF;
 INSERT INTO guest_artists(name,title,image,description,specialty,enabled,desktop_gallery_images,desktop_stage_clip_urls,stage_light_color) VALUES('[temporary artist stage verification]','Test','https://example.invalid/p.webp','Test','Test',false,ARRAY['https://example.invalid/wide.webp'],ARRAY['https://example.invalid/wide.mp4'],'#54cbb0') RETURNING id INTO probe_id;
 IF NOT EXISTS(SELECT 1 FROM guest_artists WHERE id=probe_id AND cardinality(desktop_gallery_images)=1 AND cardinality(desktop_stage_clip_urls)=1 AND stage_light_color='#54cbb0') THEN RAISE EXCEPTION 'Responsive media save mismatch';END IF;
 END $$;ROLLBACK;`,false);
 report.rolledBackDisplayCrud=true;
 report.rolledBackArtistCrud=true;
 report.rolledBackProfileCrud=true;
 const [leftovers]=await sql("SELECT count(*)::integer AS remaining FROM guest_artists WHERE name='[temporary artist stage verification]'");
 report.noTestRowsLeft=leftovers.remaining===0;
 const publicKey=env.VITE_SUPABASE_ANON_KEY||env.SUPABASE_ANON_KEY;
 if(publicKey){
  const response=await fetch(`${endpoint}/rest/v1/guest_artists?select=id,festival_year,gallery_images,track_title,artist_kind,stage_media_mode,stage_clip_urls,stage_clip_seconds,spotify_collection_url,featured_songs,desktop_gallery_images,desktop_stage_clip_urls,stage_light_color&enabled=eq.true&limit=1`,{headers:{apikey:publicKey,Authorization:`Bearer ${publicKey}`},signal:AbortSignal.timeout(20000)});
  report.publicApi=response.ok&&Array.isArray(await response.json());
 }
}
report.ok=Object.values(report.database).every(Boolean)&&report.noTestRowsLeft!==false&&report.publicApi!==false;
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
