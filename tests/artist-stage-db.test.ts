import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';

const db = new PGlite();
let migration: string;
beforeAll(async () => {
  const baseline = await readFile(new URL('../supabase/migrations/20260326000000_baseline.sql', import.meta.url), 'utf8');
  const table = baseline.match(/CREATE TABLE IF NOT EXISTS "public"\."guest_artists" \([\s\S]*?\n\);/);
  if (!table) throw new Error('Actual artist schema missing');
  await db.exec(table[0]);
  await db.exec('ALTER TABLE guest_artists ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY');
  await db.exec(await readFile(new URL('../supabase/migrations/20261109000000_guest_artist_media_and_auto_home.sql', import.meta.url), 'utf8'));
  await db.exec("INSERT INTO guest_artists(name,title,image,description,specialty,performance_at) VALUES ('Archived artist','Singer','photo.webp','A previous edition','Indie','2025-11-10T18:00:00Z'),('Undated artist','Band','band.webp','No schedule yet','Fusion',NULL)");
  migration = await readFile(new URL('../supabase/migrations/20261124120000_artist_stage_editions.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(await readFile(new URL('../supabase/migrations/20261124160000_artist_profiles_and_stage_clips.sql',import.meta.url),'utf8'));
  await db.exec('CREATE TABLE homepage_settings(id integer PRIMARY KEY); INSERT INTO homepage_settings VALUES(1)');
  await db.exec(await readFile(new URL('../supabase/migrations/20261124180000_artist_stage_display_and_responsive_media.sql',import.meta.url),'utf8'));
});
afterAll(async () => db.close());
it('keeps dated past artists in their original edition and safely defaults undated profiles', async () => {
  const {rows} = await db.query<any>('SELECT name,festival_year,gallery_images,track_title FROM guest_artists ORDER BY id');
  expect(rows).toEqual([{name:'Archived artist',festival_year:2025,gallery_images:[],track_title:''},{name:'Undated artist',festival_year:2026,gallery_images:[],track_title:''}]);
});
it('persists and updates an edition, three slideshow photos and the chosen track without affecting visibility', async () => {
  const {rows:[created]} = await db.query<any>("INSERT INTO guest_artists(name,title,image,description,specialty,festival_year,gallery_images,track_title,detail_music_url,enabled) VALUES ('Stage verification','Singer','portrait.webp','Test profile','Soul',2024,ARRAY['one.webp','two.webp','three.webp'],'My selected song','song.mp3',false) RETURNING *");
  expect(created).toMatchObject({festival_year:2024,gallery_images:['one.webp','two.webp','three.webp'],track_title:'My selected song',detail_music_url:'song.mp3',enabled:false});
  await db.query("UPDATE guest_artists SET festival_year=2026,gallery_images=ARRAY['replacement.webp'],track_title='New song' WHERE id=$1", [created.id]);
  const {rows:[updated]} = await db.query<any>('SELECT * FROM guest_artists WHERE id=$1', [created.id]);
  expect(updated).toMatchObject({festival_year:2026,gallery_images:['replacement.webp'],track_title:'New song',enabled:false});
  await db.query('UPDATE guest_artists SET gallery_images=ARRAY[]::text[] WHERE id=$1', [created.id]);
});
it('rejects invalid years, oversized galleries, null photos and oversized track titles', async () => {
  for (const update of ["festival_year=1999", "gallery_images=ARRAY['a','b','c','d']", "gallery_images=ARRAY[NULL]::text[]", "track_title=repeat('x',241)"]) {
    await expect(db.exec(`UPDATE guest_artists SET ${update} WHERE name='Undated artist'`)).rejects.toThrow();
  }
});
it('can be reapplied without resetting saved years and media', async () => {
  await db.exec(migration);
  const {rows:[saved]} = await db.query<any>("SELECT * FROM guest_artists WHERE name='Stage verification'");
  expect(saved).toMatchObject({festival_year:2026,track_title:'New song',gallery_images:[]});
});

it('saves artist/band identity, three clips, Spotify and a curated song list together',async()=>{
 const songs=[{title:'Festival song',url:'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ'}];
 const {rows:[saved]}=await db.query<any>(`INSERT INTO guest_artists(name,title,image,description,specialty,enabled,artist_kind,stage_media_mode,stage_clip_urls,stage_clip_seconds,spotify_collection_url,featured_songs) VALUES ('Profile stage check','Live band','band.webp','Group intro','Fusion',false,'band','clips',ARRAY['one.mp4','two.mp4','three.mp4'],60,'https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx',$1::jsonb) RETURNING *`,[JSON.stringify(songs)]);
 expect(saved).toMatchObject({artist_kind:'band',stage_media_mode:'clips',stage_clip_urls:['one.mp4','two.mp4','three.mp4'],stage_clip_seconds:60,featured_songs:songs});
 await db.query("UPDATE guest_artists SET stage_media_mode='photos',stage_clip_urls='{}',featured_songs='[]',spotify_collection_url='' WHERE id=$1",[saved.id]);
 const {rows:[cleared]}=await db.query<any>('SELECT * FROM guest_artists WHERE id=$1',[saved.id]);expect(cleared).toMatchObject({artist_kind:'band',stage_media_mode:'photos',stage_clip_urls:[],featured_songs:[],spotify_collection_url:''});
});
it('backfills older bands safely and enforces clip/profile/song limits',async()=>{
 const {rows:[old]}=await db.query<any>("SELECT * FROM guest_artists WHERE name='Undated artist'");expect(old.artist_kind).toBe('band');
 for(const patch of ["artist_kind='unknown'","stage_media_mode='flash'","stage_clip_urls=ARRAY['a','b','c','d']","stage_clip_urls=ARRAY[NULL]::text[]","stage_clip_seconds=999","featured_songs='{}'::jsonb","featured_songs=(SELECT jsonb_agg('{}'::jsonb) FROM generate_series(1,13))"]){await expect(db.exec(`UPDATE guest_artists SET ${patch} WHERE name='Undated artist'`)).rejects.toThrow();}
 const migration=await readFile(new URL('../supabase/migrations/20261124160000_artist_profiles_and_stage_clips.sql',import.meta.url),'utf8');await db.exec(migration);
 const {rows:[saved]}=await db.query<any>("SELECT * FROM guest_artists WHERE name='Profile stage check'");expect(saved).toMatchObject({artist_kind:'band',stage_media_mode:'photos',featured_songs:[]});
});

it('saves configured public years, two festival labels, desktop media and artist light colour',async()=>{
 const config={visible_years:[2026,2023],date_label:'DEC 2026',venue_label:'The Arena',lights_enabled:true,beat_sync:true};await db.query('UPDATE homepage_settings SET artist_stage_settings=$1::jsonb WHERE id=1',[JSON.stringify(config)]);const {rows:[row]}=await db.query<any>('SELECT artist_stage_settings FROM homepage_settings WHERE id=1');expect(row.artist_stage_settings).toEqual(config);await db.exec("UPDATE guest_artists SET desktop_gallery_images=ARRAY['wide.webp'],desktop_stage_clip_urls=ARRAY['wide.mp4'],stage_light_color='#54cbb0' WHERE name='Undated artist'");const {rows:[artist]}=await db.query<any>("SELECT * FROM guest_artists WHERE name='Undated artist'");expect(artist).toMatchObject({desktop_gallery_images:['wide.webp'],desktop_stage_clip_urls:['wide.mp4'],stage_light_color:'#54cbb0'});
});
it('rejects malformed stage settings, desktop arrays and light colours',async()=>{
 for(const config of [{visible_years:[]},{visible_years:[1999]},{visible_years:['2026']},{date_label:''},{venue_label:'x'.repeat(121)},{lights_enabled:'yes'}])await expect(db.query('UPDATE homepage_settings SET artist_stage_settings=$1::jsonb WHERE id=1',[JSON.stringify(config)])).rejects.toThrow();for(const patch of ["desktop_gallery_images=ARRAY['a','b','c','d']","desktop_stage_clip_urls=ARRAY[NULL]::text[]","stage_light_color='red'"])await expect(db.exec(`UPDATE guest_artists SET ${patch} WHERE name='Undated artist'`)).rejects.toThrow();
});
