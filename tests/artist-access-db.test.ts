import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {beforeAll,afterAll,expect,it} from 'vitest';
const db=new PGlite();
const owner='00000000-0000-4000-8000-000000000001',artist='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003',student='00000000-0000-4000-8000-000000000004';
const config={visible_years:[2026,2024],date_label:'NOV 2026',venue_label:'Main stage',lights_enabled:true,beat_sync:true};
let migration:string;
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS text LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.uid',true),'')$$;
 CREATE TABLE admin_users(user_id text PRIMARY KEY,role text,allowed_pages text[],revoked boolean DEFAULT false);
 INSERT INTO admin_users VALUES('${owner}','owner','{}',false),('${artist}','admin','{guest-artists}',false),('${other}','admin','{band}',false);
 CREATE FUNCTION admin_is_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id=auth.uid() AND role='owner' AND NOT revoked)$$;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT admin_is_owner() OR EXISTS(SELECT 1 FROM admin_users WHERE user_id=auth.uid() AND role='admin' AND allowed_pages&&p AND NOT revoked)$$;
 REVOKE ALL ON FUNCTION admin_can_manage_pages(text[],text[]) FROM PUBLIC;
 GRANT EXECUTE ON FUNCTION admin_can_manage_pages(text[],text[]) TO authenticated,service_role;
 CREATE TABLE guest_artists(id serial PRIMARY KEY,name text,enabled boolean DEFAULT true);
 CREATE TABLE homepage_settings(id integer PRIMARY KEY,brand_year integer DEFAULT 2026,updated_at timestamptz);
 INSERT INTO homepage_settings(id)VALUES(1);INSERT INTO guest_artists(name,enabled)VALUES('Published',true),('Hidden draft',false);
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id serial PRIMARY KEY,bucket_id text,name text);
 ALTER TABLE guest_artists ENABLE ROW LEVEL SECURITY;ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_artist_read ON guest_artists FOR SELECT USING(true);
 CREATE POLICY legacy_artist_write ON guest_artists FOR ALL TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY legacy_storage ON storage.objects FOR ALL USING(true) WITH CHECK(true);
 CREATE POLICY homepage_read ON homepage_settings FOR SELECT USING(true);
 CREATE POLICY homepage_owner ON homepage_settings FOR ALL USING(admin_is_owner()) WITH CHECK(admin_is_owner());
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated;GRANT ALL ON guest_artists,homepage_settings,storage.objects TO anon,authenticated;GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public,storage TO anon,authenticated;`);
 await db.exec(await readFile('supabase/migrations/20261124180000_artist_stage_display_and_responsive_media.sql','utf8'));
 migration=await readFile('supabase/migrations/20261124200000_artist_access_and_buckets.sql','utf8');await db.exec(migration);
},30000);
afterAll(()=>db.close());
async function as(role:string,id=''){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.uid',$1,false)",[id]);await db.exec(`SET ROLE ${role}`);}
it('hides unpublished profiles from public, students and admins of other pages',async()=>{
 for(const [role,id] of [['anon',''],['authenticated',student],['authenticated',other]]){await as(role,id);expect((await db.query('SELECT name FROM guest_artists ORDER BY id')).rows).toEqual([{name:'Published'}]);}
 await as('authenticated',artist);expect((await db.query('SELECT name FROM guest_artists')).rows).toHaveLength(2);
});
it('restricts profile CRUD to artist staff and owners despite legacy grants',async()=>{
 for(const [role,id] of [['anon',''],['authenticated',student],['authenticated',other]]){await as(role,id);await expect(db.exec("INSERT INTO guest_artists(name)VALUES('Blocked')")).rejects.toThrow(/row-level security/);expect((await db.query("UPDATE guest_artists SET name='Blocked' RETURNING id")).rows).toHaveLength(0);expect((await db.query('DELETE FROM guest_artists RETURNING id')).rows).toHaveLength(0);}
 for(const id of [artist,owner]){await as('authenticated',id);const {rows:[row]}=await db.query<{id:number}>("INSERT INTO guest_artists(name,enabled)VALUES('Artist CRUD',false)RETURNING id");expect((await db.query("UPDATE guest_artists SET name='Updated' WHERE id=$1 RETURNING id",[row.id])).rows).toHaveLength(1);expect((await db.query('DELETE FROM guest_artists WHERE id=$1 RETURNING id',[row.id])).rows).toHaveLength(1);}
});
it('allows scoped uploads in all three buckets and blocks anonymous/student/other-page writes',async()=>{
 for(const bucket of ['guest-artist-images','guest-artist-videos','guest-artist-audio']){
  for(const [role,id] of [['anon',''],['authenticated',student],['authenticated',other]]){await as(role,id);await expect(db.query('INSERT INTO storage.objects(bucket_id,name)VALUES($1,$2)',[bucket,'blocked'])).rejects.toThrow(/row-level security/);}
  await as('authenticated',artist);const {rows:[row]}=await db.query<{id:number}>('INSERT INTO storage.objects(bucket_id,name)VALUES($1,$2)RETURNING id',[bucket,'owned']);await as('authenticated',other);expect((await db.query("UPDATE storage.objects SET name='blocked' WHERE id=$1 RETURNING id",[row.id])).rows).toHaveLength(0);expect((await db.query('DELETE FROM storage.objects WHERE id=$1 RETURNING id',[row.id])).rows).toHaveLength(0);await as('authenticated',artist);expect((await db.query('DELETE FROM storage.objects WHERE id=$1 RETURNING id',[row.id])).rows).toHaveLength(1);
 }
});
it('lets artist staff save only stage settings without granting homepage editing',async()=>{
 await as('authenticated',artist);expect((await db.query('SELECT save_artist_stage_settings($1::jsonb) saved',[JSON.stringify(config)])).rows).toEqual([{saved:config}]);expect((await db.query('UPDATE homepage_settings SET brand_year=2030 RETURNING id')).rows).toHaveLength(0);
 await expect(db.query('SELECT save_artist_stage_settings($1::jsonb)',[JSON.stringify({...config,brand_year:2030})])).rejects.toThrow(/Invalid artist/);await expect(db.query('SELECT save_artist_stage_settings($1::jsonb)',[JSON.stringify({visible_years:[]})])).rejects.toThrow(/Invalid artist/);
 for(const id of [student,other]){await as('authenticated',id);await expect(db.query('SELECT save_artist_stage_settings($1::jsonb)',[JSON.stringify(config)])).rejects.toThrow(/management access/);}
 await as('anon');await expect(db.query('SELECT save_artist_stage_settings($1::jsonb)',[JSON.stringify(config)])).rejects.toThrow(/permission denied/);
});
it('revokes artist access and keeps bucket configuration exact on migration reruns',async()=>{
 await db.exec('RESET ROLE');await db.query('UPDATE admin_users SET revoked=true WHERE user_id=$1',[artist]);await as('authenticated',artist);expect((await db.query('SELECT * FROM guest_artists')).rows).toHaveLength(1);await expect(db.exec("INSERT INTO guest_artists(name)VALUES('Revoked')")).rejects.toThrow(/row-level security/);
 await db.exec('RESET ROLE');await db.exec(migration);const {rows}=await db.query<any>('SELECT * FROM storage.buckets ORDER BY id');expect(rows.map(row=>Number(row.file_size_limit))).toEqual([25*1024*1024,50*1024*1024,50*1024*1024]);expect(rows.every(row=>row.public)).toBe(true);expect(rows[1].allowed_mime_types.every((type:string)=>type.startsWith('image/')&&!type.includes('svg'))).toBe(true);
});
it('signals publish/hide changes through public settings without exposing the hidden profile',async()=>{
 await db.exec('RESET ROLE');await db.query('UPDATE admin_users SET revoked=false WHERE user_id=$1',[artist]);await db.exec("UPDATE homepage_settings SET updated_at='2000-01-01'");await as('anon');await db.exec("UPDATE guest_artists SET enabled=false WHERE name='Published'");expect((await db.query("SELECT updated_at='2000-01-01' AS untouched FROM homepage_settings WHERE id=1")).rows).toEqual([{untouched:true}]);await as('authenticated',artist);await db.exec("UPDATE guest_artists SET enabled=false WHERE name='Published'");
 await as('anon');expect((await db.query('SELECT name FROM guest_artists')).rows).toHaveLength(0);expect((await db.query("SELECT updated_at>'2000-01-01' AS changed FROM homepage_settings WHERE id=1")).rows).toEqual([{changed:true}]);
});
