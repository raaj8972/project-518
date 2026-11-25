import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db = new PGlite();
const student='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002', owner='00000000-0000-4000-8000-000000000003', staff='00000000-0000-4000-8000-000000000004';
const migration = await readFile('supabase/migrations/20261124010000_prelaunch_security_remediation.sql','utf8');
const photoReaders = await readFile('supabase/migrations/20261124011000_private_registration_photo_readers.sql','utf8');
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA extensions;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT (auth.jwt()->>'sub')::uuid$$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT auth.jwt()->>'role'$$;
 CREATE FUNCTION session_is_current() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid() IS NOT NULL AND coalesce(auth.jwt()->>'revoked','false')='false'$$;
 CREATE FUNCTION admin_is_owner() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT session_is_current() AND auth.uid()='${owner}'::uuid$$;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT session_is_current() AND (admin_is_owner() OR (auth.uid()='${staff}'::uuid AND p && ARRAY['gallery','security-passes','auditions','registration-photos']))$$;
 CREATE FUNCTION coordinates_event(p text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT session_is_current() AND auth.jwt()->>'event'=p$$;
 CREATE FUNCTION extensions.crypt(text,text) RETURNS text LANGUAGE sql STRICT AS $$SELECT 'fixture-'||$1$$;
 CREATE FUNCTION extensions.gen_random_bytes(integer) RETURNS bytea LANGUAGE sql AS $$SELECT decode(md5(random()::text),'hex')$$;
 CREATE TABLE security_settings(id int,council_password_hash text,council_passcode text,updated_at timestamptz,councils_enabled boolean DEFAULT true);
 INSERT INTO security_settings(id,council_password_hash,council_passcode,updated_at) VALUES(1,'fixture-known-seed','known-seed',now());
 CREATE FUNCTION verify_council_password(p_password text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM security_settings WHERE council_password_hash=extensions.crypt(p_password,council_password_hash))$$;
 CREATE TABLE entry_passes(id uuid DEFAULT gen_random_uuid(),pass_token text,pass_type text,participant_name text,notes text,created_by uuid,valid_date date);
 CREATE TABLE pass_scans(pass_id uuid);
 CREATE TABLE registrations(id text,user_id uuid,event_id text,photo_url text,is_active boolean DEFAULT false,is_team_registration boolean DEFAULT false,team_name text);CREATE TABLE events(id text,current_registrations int);INSERT INTO events VALUES('event-a',10);
 CREATE TABLE sports_registrations(id text,user_id uuid,photo_url text,status text DEFAULT 'pending',is_active boolean DEFAULT false);CREATE TABLE annual_sports_registrations(id text,user_id uuid,photo_url text,status text DEFAULT 'pending',is_active boolean DEFAULT false);
 CREATE POLICY legacy_all ON sports_registrations FOR ALL USING(true) WITH CHECK(true);CREATE POLICY legacy_all ON annual_sports_registrations FOR ALL USING(true) WITH CHECK(true);
 CREATE TABLE student_groups(id uuid,owner_id uuid,name text);
 CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 INSERT INTO storage.buckets(id,public) SELECT unnest(ARRAY['avatars','gallery','registration-photos','chat-attachments','fonts','pdf-watermarks','hero_v2','team-branding','sports-images','uploads']),true;
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_all ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 CREATE TABLE auditions(id int,email text);CREATE TABLE memberships(id int,email text);
 ALTER TABLE auditions ENABLE ROW LEVEL SECURITY;ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_all ON auditions FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 CREATE POLICY legacy_all ON memberships FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 INSERT INTO auditions VALUES(1,'private@example.test');INSERT INTO memberships VALUES(1,'private@example.test');
 CREATE FUNCTION register_for_event() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$INSERT INTO registrations(id) VALUES('bypass')$$;
 CREATE FUNCTION process_pass_scan_v3() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$SELECT$$;
 CREATE FUNCTION purge_all_logs() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$SELECT$$;
 CREATE FUNCTION get_council_vip_passes(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$SELECT 'private'::text$$;
 CREATE FUNCTION update_pass_date(p_pass_id uuid,p_new_date date) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN UPDATE entry_passes SET valid_date=p_new_date WHERE id=p_pass_id;RETURN '{}'::json;END$$;
 GRANT USAGE ON SCHEMA public,auth,storage,extensions TO anon,authenticated,service_role;
 GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated,service_role;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public,auth TO anon,authenticated,service_role;
 INSERT INTO storage.objects(bucket_id,name) VALUES('registration-photos','legacy.jpg'),('registration-photos','${student}/self.jpg'),('gallery','poster.jpg');
 INSERT INTO registrations VALUES('registration-a','${student}','event-a','https://project.supabase.co/storage/v1/object/public/registration-photos/legacy.jpg');
 `);
 await db.exec(migration);await db.exec(migration);await db.exec(photoReaders);await db.exec(await readFile('supabase/migrations/20261124012000_council_enabled_session_guard.sql','utf8'));await db.exec(await readFile('supabase/migrations/20261124013000_sports_registration_write_guards.sql','utf8'));await db.exec(await readFile('supabase/migrations/20261124014000_registration_cancellation_ownership.sql','utf8'));
},30000);
afterAll(()=>db.close());
async function as(role:string,id?:string,extra:object={}){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({role,sub:id,...extra})]);await db.exec(`SET ROLE ${role}`);}
const rows=async(sql:string)=> (await db.query(sql)).rows;
it('closes legacy RPCs to anonymous and ordinary signed-in clients, retaining server access',async()=>{
 for(const role of ['anon','authenticated']){await as(role,role==='authenticated'?student:undefined);for(const name of ['register_for_event()','process_pass_scan_v3()','purge_all_logs()',"get_council_vip_passes('password')","verify_council_password('password')"])await expect(db.exec('SELECT '+name)).rejects.toThrow(/permission denied/);}
 await as('service_role');expect(await rows("SELECT has_function_privilege('service_role','get_council_vip_passes(text)','EXECUTE') allowed")).toEqual([{allowed:true}]);
});
it('rejects pass management by a student, even with a valid council password',async()=>{
 await as('service_role');await db.exec("UPDATE security_settings SET council_password_hash='fixture-strong-password',council_passcode=NULL");
 await as('authenticated',student);await expect(db.exec("SELECT create_vip_pass_v3('strong-password','Forged')")).rejects.toThrow(/access required/);
 await expect(db.exec("SELECT update_pass_date(gen_random_uuid(),current_date)")).rejects.toThrow(/Access denied/);
 await as('authenticated',staff,{revoked:true});await expect(db.exec("SELECT create_vip_pass_v3(NULL,'Revoked')")).rejects.toThrow(/access required/);
});
it('preserves authorized admin and council-server VIP actions',async()=>{
 await as('authenticated',staff);const result=(await rows("SELECT create_vip_pass_v3(NULL,'Legitimate') result"))[0] as any;expect(result.result.success).toBe(true);
 await db.query('SELECT update_pass_date($1,current_date)',[result.result.pass_id]);
 await as('service_role');expect(((await rows("SELECT create_vip_pass_v3('strong-password','Council') result"))[0] as any).result.success).toBe(true);
 await expect(db.exec("SELECT create_vip_pass_v3('wrong','Wrong')")).rejects.toThrow(/access required/);
});
it('blocks anonymous storage writes despite legacy USING(true) policies',async()=>{
 await as('anon');await expect(db.exec("INSERT INTO storage.objects(bucket_id,name) VALUES('gallery','evil.html')")).rejects.toThrow(/row-level security/);
 expect(await rows("UPDATE storage.objects SET name='overwritten' WHERE bucket_id='gallery' RETURNING name")).toEqual([]);
 expect(await rows("DELETE FROM storage.objects WHERE bucket_id='gallery' RETURNING name")).toEqual([]);
 expect(await rows("SELECT name FROM storage.objects WHERE bucket_id='gallery'")).toEqual([{name:'poster.jpg'}]);
});
it('allows own avatar uploads and blocks moving/overwriting another student file',async()=>{
 await as('authenticated',student);await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',$1)",[student+'/avatar.jpg']);
 await expect(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',$1)",[other+'/avatar.jpg'])).rejects.toThrow(/row-level security/);
 await expect(db.query("UPDATE storage.objects SET name=$1 WHERE bucket_id='avatars'",[other+'/avatar.jpg'])).rejects.toThrow(/row-level security/);
 expect(await rows("DELETE FROM storage.objects WHERE bucket_id='avatars' RETURNING name")).toHaveLength(1);
});
it('enforces assigned bucket scope for staff',async()=>{
 await as('authenticated',staff);await db.exec("INSERT INTO storage.objects(bucket_id,name) VALUES('gallery','new-poster.png')");await expect(db.exec("INSERT INTO storage.objects(bucket_id,name) VALUES('fonts','evil.woff')")).rejects.toThrow(/row-level security/);
 await as('authenticated',owner);await db.exec("INSERT INTO storage.objects(bucket_id,name) VALUES('fonts','font.woff')");
});
it('keeps registration photos private with own, assigned staff and event-coordinator reads',async()=>{
 await as('anon');expect(await rows("SELECT name FROM storage.objects WHERE bucket_id='registration-photos'")).toEqual([]);
 await as('authenticated',other);expect(await rows("SELECT name FROM storage.objects WHERE bucket_id='registration-photos'")).toEqual([]);
 await as('authenticated',student);expect(await rows("SELECT name FROM storage.objects WHERE bucket_id='registration-photos'")).toEqual([{name:'legacy.jpg'},{name:student+'/self.jpg'}]);
 await as('authenticated',other,{event:'event-a'});expect(await rows("SELECT name FROM storage.objects WHERE bucket_id='registration-photos'")).toEqual([{name:'legacy.jpg'}]);
 await as('authenticated',staff);expect(await rows("SELECT name FROM storage.objects WHERE bucket_id='registration-photos'")).toHaveLength(2);
});
it('keeps public application submission but restricts contact reads to assigned staff',async()=>{
 await as('anon');expect(await rows('SELECT * FROM auditions')).toEqual([]);await db.exec("INSERT INTO auditions VALUES(2,'new@example.test')");
 await as('authenticated',student);expect(await rows('SELECT * FROM auditions')).toEqual([]);
 await as('authenticated',staff);expect(await rows('SELECT * FROM auditions')).toHaveLength(2);expect(await rows('SELECT * FROM memberships')).toEqual([]);
 await as('authenticated',owner);expect(await rows('SELECT * FROM memberships')).toHaveLength(1);
});
it('caps every fixture bucket, excludes active HTML/SVG uploads, and makes sensitive buckets private',async()=>{
 await as('service_role');const buckets=await rows('SELECT * FROM storage.buckets') as any[];expect(buckets.every(b=>b.file_size_limit>0&&b.allowed_mime_types.length>0)).toBe(true);expect(buckets.every(b=>!b.allowed_mime_types.includes('image/svg+xml')&&!b.allowed_mime_types.includes('text/html'))).toBe(true);expect(buckets.filter(b=>['chat-attachments','registration-photos'].includes(b.id)).every(b=>!b.public)).toBe(true);
});
it('does not reinstall a committed council default on rerun',async()=>{
 await as('service_role');await db.exec("UPDATE security_settings SET council_password_hash='fixture-known-seed',council_passcode='known-seed'");await db.exec('RESET ROLE');await db.exec(migration);await db.exec(photoReaders);await db.exec(await readFile('supabase/migrations/20261124012000_council_enabled_session_guard.sql','utf8'));expect(await rows('SELECT council_password_hash,council_passcode FROM security_settings')).toEqual([{council_password_hash:null,council_passcode:null}]);
});

it('revokes sealed council access when the owner disables the council portal',async()=>{
 await as('service_role');await db.exec("UPDATE security_settings SET council_password_hash='fixture-strong-password',council_passcode=NULL,councils_enabled=true");expect(await rows("SELECT verify_council_password('strong-password') allowed")).toEqual([{allowed:true}]);await db.exec('UPDATE security_settings SET councils_enabled=false');expect(await rows("SELECT verify_council_password('strong-password') allowed")).toEqual([{allowed:false}]);
});

it('does not turn a forged registration photo URL into private-file access',async()=>{
 await as('service_role');await db.exec("INSERT INTO storage.objects(bucket_id,name) VALUES('registration-photos','unrelated-private.jpg')");
 await as('authenticated',student);await db.query("INSERT INTO registrations VALUES('forged',$1,'event-a','https://project.supabase.co/storage/v1/object/public/registration-photos/unrelated-private.jpg')",[student]);
 expect(await rows("SELECT name FROM storage.objects WHERE name='unrelated-private.jpg'")).toEqual([]);
 await as('authenticated',other,{event:'event-a'});expect(await rows("SELECT name FROM storage.objects WHERE name='unrelated-private.jpg'")).toEqual([]);
 await expect(db.exec("INSERT INTO registration_photo_access VALUES('event','forged','unrelated-private.jpg',NULL,'event-a')")).rejects.toThrow(/permission denied/);
 await db.exec('RESET ROLE');await db.exec(photoReaders);await as('authenticated',other,{event:'event-a'});expect(await rows("SELECT name FROM storage.objects WHERE name='unrelated-private.jpg'")).toEqual([]);
});

it('prevents sports/annual identity forgery and self-approval while retaining own pending submissions',async()=>{
 for(const table of ['sports_registrations','annual_sports_registrations']){
  await as('authenticated',student);await db.query(`INSERT INTO ${table}(id,user_id) VALUES('own',$1)`,[student]);
  await expect(db.query(`INSERT INTO ${table}(id,user_id) VALUES('forged',$1)`,[other])).rejects.toThrow(/row-level security/);
  await expect(db.query(`INSERT INTO ${table}(id,user_id,status) VALUES('approved',$1,'approved')`,[student])).rejects.toThrow(/row-level security/);
  expect(await rows(`UPDATE ${table} SET status='approved' RETURNING id`)).toEqual([]);expect(await rows(`DELETE FROM ${table} RETURNING id`)).toEqual([]);
  await as('authenticated',owner);expect(await rows(`UPDATE ${table} SET status='approved' RETURNING id`)).toEqual([{id:'own'}]);
 }
});

it('limits cancellation to the owner and never deletes another team by a matching name',async()=>{
 await as('service_role');await db.query("INSERT INTO student_groups VALUES(gen_random_uuid(),$1,'Twin Crew')",[other]);await db.query("INSERT INTO registrations(id,user_id,event_id,is_team_registration,team_name)VALUES('other-team-entry',$1,'event-a',true,'Twin Crew')",[student]);
 await as('authenticated',other);await expect(db.exec("SELECT cancel_registration('other-team-entry')")).rejects.toThrow(/access denied/);await expect(db.exec("SELECT cancel_registration('registration-a')")).rejects.toThrow(/access denied/);
 await as('authenticated',student,{revoked:true});await expect(db.exec("SELECT cancel_registration('registration-a')")).rejects.toThrow(/Sign in|Access denied/);
 await as('authenticated',student);await db.query("INSERT INTO registrations(id,user_id,event_id,is_active) VALUES('active',$1,'event-a',true)",[student]);await expect(db.exec("SELECT cancel_registration('active')")).rejects.toThrow(/activated/);
 await db.exec("SELECT cancel_registration('registration-a')");expect(await rows("SELECT id FROM registrations WHERE id='registration-a'")).toEqual([]);expect(await rows("SELECT id FROM registrations WHERE id='active'")).toHaveLength(1);
 await as('anon');await expect(db.exec("SELECT cancel_registration('active')")).rejects.toThrow(/permission denied/);
});
