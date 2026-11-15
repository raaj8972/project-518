import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {beforeAll,afterAll,expect,it} from 'vitest';
import {normalizeGuestArtists,selectHomepageArtists} from '../src/utils/guestArtists';
const db=new PGlite();let migration:string;
beforeAll(async()=>{
 const baseline=await readFile(new URL('../supabase/migrations/20260326000000_baseline.sql',import.meta.url),'utf8');const schema=baseline.match(/CREATE TABLE IF NOT EXISTS "public"\."guest_artists" \([\s\S]*?\n\);/);if(!schema)throw new Error('Actual guest_artists schema not found');
 await db.exec(schema[0]);await db.exec('ALTER TABLE public.guest_artists ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;');
 await db.exec("INSERT INTO guest_artists(name,title,image,description,specialty,achievements,social_links,is_featured)VALUES('Older artist','Vocalist','old.jpg','Previous profile','Fusion',NULL,NULL,false);");
 migration=await readFile(new URL('../supabase/migrations/20261109000000_guest_artist_media_and_auto_home.sql',import.meta.url),'utf8');await db.exec(migration);
});
afterAll(async()=>db.close());
it('adds the actual missing media fields and makes featuring the default without requiring a toggle',async()=>{
 const saved=await db.query<any>("INSERT INTO guest_artists(name,title,image,description,specialty)VALUES('Dummy save','Performer','portrait.jpg','Save test','Live music')RETURNING *");
 expect(saved.rows[0]).toMatchObject({is_featured:true,card_media_url:null,card_media_is_video:false,detail_music_url:null,enabled:true});expect(saved.rows[0].id).toBeTruthy();
 const fetched=await db.query<any>('SELECT * FROM guest_artists WHERE id=$1',[saved.rows[0].id]);expect(selectHomepageArtists(fetched.rows)).toHaveLength(1);
});
it('round-trips a complete dummy artist with portrait, motion poster, audio and non-null social/list objects',async()=>{
 const inserted=await db.query<any>(`INSERT INTO guest_artists(name,title,image,description,specialty,achievements,social_links,card_media_url,card_media_is_video,detail_music_url,video_url,enabled)VALUES('Media save','Performer','portrait.png','Media test','Fusion',ARRAY[]::text[],'{}'::jsonb,'poster.mp4',true,'music.wav','clip.mp4',true)RETURNING id`);
 const {rows:[saved]}=await db.query<any>('SELECT * FROM guest_artists WHERE id=$1',[inserted.rows[0].id]);expect(saved).toMatchObject({image:'portrait.png',card_media_url:'poster.mp4',card_media_is_video:true,detail_music_url:'music.wav',video_url:'clip.mp4',achievements:[],social_links:{},is_featured:true});
});
it('keeps nullable older data usable and does not require media or JSON placeholders for optional fields',async()=>{
 const old=await db.query<any>("SELECT * FROM guest_artists WHERE name='Older artist'");expect(old.rows[0].is_featured).toBe(true);expect(normalizeGuestArtists(old.rows)[0]).toMatchObject({achievements:[],social_links:{}});
});
it('rolls a dummy insert back without leaving fake content',async()=>{
 await db.exec('BEGIN');await db.exec("INSERT INTO guest_artists(name,title,image,description,specialty)VALUES('Rollback dummy','Performer','portrait.jpg','Rollback test','Fusion')");const inside=await db.query<any>("SELECT * FROM guest_artists WHERE name='Rollback dummy'");expect(inside.rows).toHaveLength(1);await db.exec('ROLLBACK');const after=await db.query("SELECT * FROM guest_artists WHERE name='Rollback dummy'");expect(after.rows).toHaveLength(0);
});
it('can apply the additive migration again without losing saved media',async()=>{
 await db.exec(migration);const saved=await db.query<any>("SELECT * FROM guest_artists WHERE name='Media save'");expect(saved.rows[0].card_media_url).toBe('poster.mp4');
});
