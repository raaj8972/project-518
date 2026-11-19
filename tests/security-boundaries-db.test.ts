import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, expect, it } from 'vitest';
const db = new PGlite();
const student='00000000-0000-0000-0000-000000000001';
const other='00000000-0000-0000-0000-000000000002';
const owner='00000000-0000-0000-0000-000000000003';
beforeAll(async()=>{
 const baseline=await readFile(new URL('../supabase/migrations/20260326000000_baseline.sql',import.meta.url),'utf8');
 const xpSchema=baseline.match(/CREATE TABLE IF NOT EXISTS "public"\."student_xp" \([\s\S]*?\n\);/);
 if(!xpSchema)throw new Error('Missing saved student_xp schema');
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE auth.mfa_factors(user_id uuid,status text);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 CREATE TABLE admin_users(user_id text,role text,is_primary boolean);
 CREATE TABLE admin_permissions(user_id text,can_events boolean,can_registrations boolean,can_security_passes boolean);
 CREATE FUNCTION get_function_definition(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'private definition' $$;
 CREATE TABLE profiles(id uuid,full_name text,username text,avatar_url text,aura_color text,background_url text,batch text,likes_count int,is_approved boolean,email text);
 ${xpSchema[0]}
 CREATE TABLE student_groups(id uuid,owner_id uuid);
 CREATE TABLE student_group_members(group_id uuid,user_id uuid,status text);
 CREATE TABLE events(id text,title text);
 CREATE TABLE registrations(id text,user_id uuid,event_id text,event_title text,full_name text,team_name text,is_team_registration boolean,team_members jsonb,status text,is_active boolean,deleted_at timestamptz,email text);
 CREATE TABLE registration_rounds(registration_id text,prize_rank int);
 CREATE TABLE entry_passes(id text,user_id uuid,pass_token text);
 CREATE TABLE security_settings(id int,venue text,council_password_hash text,councils_enabled boolean);
 CREATE TABLE passkeys(id text,user_id uuid,public_key text); CREATE TABLE passkey_challenges(id text,challenge text);
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth,public TO anon,authenticated,service_role;
 GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
 GRANT ALL ON auth.mfa_factors TO service_role;
 INSERT INTO auth.users VALUES('${student}'),('${other}'),('${owner}');
 INSERT INTO profiles(id,full_name,email,is_approved,batch) VALUES('${student}','Student','private@student.test',true,'A'),('${other}','Other','private@other.test',true,'B');
 INSERT INTO student_xp(id,tier,xp_total) VALUES('${student}','Gold',250),('${other}','Silver',125);
 INSERT INTO admin_users VALUES('${owner}','owner',true);
 INSERT INTO events VALUES('event-a','Event A');
 INSERT INTO registrations(id,user_id,event_id,event_title,full_name,team_members,status,email) VALUES('registration-a','${student}','event-a','Event A','Winner','[{"name":"Member","email":"secret@example.test","phone":"private"}]','approved','private@student.test'),('registration-b','${other}','event-b','Event B','Other','[]','pending','private@other.test');
 INSERT INTO registration_rounds VALUES('registration-a',1);
 INSERT INTO entry_passes VALUES('pass-a','${student}','secret-a'),('pass-b','${other}','secret-b');
 INSERT INTO security_settings VALUES(1,'Stage','secret-hash',true);
 INSERT INTO passkeys VALUES('credential','${student}','key');
 INSERT INTO passkey_challenges VALUES('challenge','challenge-secret');
 `);
 // No session/admin/coordinator/security helper functions are preinstalled.
 // This reproduces a live schema missing the older functionality repair migration.
 // Deliberately unsafe legacy policies and column grants must not defeat the migration.
 for(const table of ['profiles','registrations','entry_passes','security_settings','passkeys','passkey_challenges','admin_users','admin_permissions']) await db.exec(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_public_access ON ${table} FOR ALL USING(true) WITH CHECK(true);`);
 await db.exec('GRANT SELECT(email) ON profiles TO anon;');
 await db.exec(await readFile(new URL('../supabase/migrations/20261119000000_security_boundaries.sql',import.meta.url),'utf8'));
},20000);
afterAll(()=>db.close());
async function as(role:string,id?:string,extra:object={}) {
 await db.exec('RESET ROLE');
 await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,role,iat:Math.floor(Date.now()/1000),...extra})]);
 await db.exec(`SET ROLE ${role}`);
}
it('denies anonymous table and column access despite public legacy policies',async()=>{
 await as('anon');
 for(const table of ['profiles','registrations','entry_passes','security_settings','passkeys','passkey_challenges']) await expect(db.query(`SELECT * FROM ${table}`)).rejects.toThrow(/permission denied/);
 await expect(db.query('SELECT email FROM profiles')).rejects.toThrow(/permission denied/);
 await expect(db.query("SELECT get_function_definition('is_owner')")).rejects.toThrow(/permission denied/);
 expect((await db.query("SELECT current_admin_access() admin,is_security_staff() security,coordinates_event('event-a') coordinator")).rows[0]).toEqual({admin:false,security:false,coordinator:false});
});
it('retains safe public profiles and awarded names without contact details or pass tokens',async()=>{
 await as('anon');
 const profiles=await db.query('SELECT * FROM public_profiles');expect(profiles.rows).toHaveLength(2);expect(profiles.rows[0]).not.toHaveProperty('email');
 expect(profiles.rows.find((row:any)=>row.id===student)?.student_xp).toEqual({tier:'Gold',xp_total:250});
 expect(profiles.rows.find((row:any)=>row.id===other)?.student_xp).toEqual({tier:'Silver',xp_total:125});
 const winners=await db.query('SELECT * FROM public_event_winners');expect(winners.rows).toHaveLength(1);expect(winners.rows[0].team_members).toEqual([{name:'Member'}]);expect(JSON.stringify(winners.rows)).not.toContain('secret@example.test');
 const settings=await db.query('SELECT * FROM security_settings_public');expect(settings.rows[0]).toEqual({id:1,venue:'Stage',councils_enabled:true});
});
it('isolates student profiles, registrations and QR tokens from other students',async()=>{
 await as('authenticated',student);
 expect((await db.query('SELECT id FROM profiles')).rows).toEqual([{id:student}]);
 expect((await db.query('SELECT id FROM registrations')).rows).toEqual([{id:'registration-a'}]);
 expect((await db.query('SELECT pass_token FROM entry_passes')).rows).toEqual([{pass_token:'secret-a'}]);
 await expect(db.query('SELECT * FROM passkeys')).rejects.toThrow(/permission denied/);
 expect((await db.query('SELECT * FROM security_settings')).rows).toHaveLength(0);
});
it('scopes coordinator reads to their signed event and preserves owner access',async()=>{
 await as('authenticated',other,{app_metadata:{role:'coordinator',coordinator_event_id:'event-a'}});
 expect((await db.query('SELECT id FROM registrations ORDER BY id')).rows).toEqual([{id:'registration-a'},{id:'registration-b'}]);
 await as('authenticated',owner);expect((await db.query('SELECT id FROM profiles')).rows).toHaveLength(2);
 expect((await db.query('SELECT * FROM security_settings')).rows).toHaveLength(1);
});
it('allows checkout contact reads only for accepted members of a shared group',async()=>{
 await as('service_role');
 await db.query('INSERT INTO student_groups VALUES($1,$2)',['00000000-0000-0000-0000-000000000010',student]);
 await db.query("INSERT INTO student_group_members VALUES($1,$2,'pending')",['00000000-0000-0000-0000-000000000010',other]);
 await as('authenticated',student);expect((await db.query('SELECT id FROM profiles')).rows).toHaveLength(1);
 await as('service_role');await db.exec("UPDATE student_group_members SET status='accepted'");
 await as('authenticated',student);expect((await db.query('SELECT id FROM profiles')).rows).toHaveLength(2);
 await as('service_role');await db.exec('DELETE FROM student_group_members; DELETE FROM student_groups;');
});
it('enforces verified native MFA and explicit session revocation on direct REST-equivalent reads',async()=>{
 await as('service_role');await db.query("INSERT INTO auth.mfa_factors VALUES($1,'verified')",[student]);
 await as('authenticated',student,{aal:'aal1'});expect((await db.query('SELECT * FROM profiles')).rows).toHaveLength(0);
 await as('authenticated',student,{aal:'aal2'});expect((await db.query('SELECT * FROM profiles')).rows).toHaveLength(1);
 await as('service_role');await db.query('INSERT INTO user_session_revocations VALUES($1,clock_timestamp())',[student]);
 await as('authenticated',student,{aal:'aal2'});expect((await db.query('SELECT * FROM profiles')).rows).toHaveLength(0);
});
it('atomically meters requests and allows only the backend to consume quotas',async()=>{
 await as('anon');await expect(db.query("SELECT consume_api_rate_limit($1,2,60)",['a'.repeat(64)])).rejects.toThrow(/permission denied/);
 await as('service_role');
 const consume=()=>db.query<{allowed:boolean}>('SELECT consume_api_rate_limit($1,2,60) allowed',['a'.repeat(64)]);
 expect((await consume()).rows[0].allowed).toBe(true);expect((await consume()).rows[0].allowed).toBe(true);expect((await consume()).rows[0].allowed).toBe(false);
 expect((await db.query('SELECT verified_enrollment FROM passkeys')).rows).toEqual([{verified_enrollment:false}]);
});

it('defines missing authorization helpers and enforces exact event scope without email shortcuts',async()=>{
 await as('authenticated',other,{app_metadata:{role:'coordinator',coordinator_event_id:'event-a'}});
 const coordinator=await db.query('SELECT coordinates_event($1) own_event,coordinates_event($2) other_event,current_admin_access() admin,is_security_staff() security',['event-a','event-b']);
 expect(coordinator.rows[0]).toEqual({own_event:true,other_event:false,admin:false,security:false});
 await as('authenticated',other,{email:'raaj@rico.fun'});
 expect((await db.query('SELECT current_admin_access() admin,admin_is_owner() owner')).rows[0]).toEqual({admin:false,owner:false});
});
it('honors configured admin pages and legacy flags while denying unrelated staff access',async()=>{
 await as('service_role');
 await db.query("INSERT INTO admin_users VALUES($1,'admin',false)",[other]);
 await db.query("INSERT INTO admin_permissions(user_id,can_events,can_security_passes) VALUES($1,true,false)",[other]);
 await as('authenticated',other);
 expect((await db.query("SELECT admin_can_manage_pages(ARRAY['events'],ARRAY['can_events']) events,is_security_staff() security")).rows[0]).toEqual({events:true,security:false});
 await as('service_role');await db.query("UPDATE admin_permissions SET page_access_configured=true,allowed_pages=ARRAY['security-passes'] WHERE user_id=$1",[other]);
 await as('authenticated',other);
 expect((await db.query("SELECT admin_can_manage_pages(ARRAY['events'],ARRAY['can_events']) events,is_security_staff() security")).rows[0]).toEqual({events:false,security:true});
 await as('service_role');await db.query('DELETE FROM admin_permissions WHERE user_id=$1',[other]);await db.query('DELETE FROM admin_users WHERE user_id=$1',[other]);
});
it('can be rerun without dropping records or duplicating policies',async()=>{
 await db.exec('RESET ROLE');
 await db.exec(await readFile(new URL('../supabase/migrations/20261119000000_security_boundaries.sql',import.meta.url),'utf8'));
 expect((await db.query('SELECT count(*)::integer total FROM profiles')).rows[0].total).toBe(2);
 expect((await db.query('SELECT count(*)::integer total FROM registrations')).rows[0].total).toBe(2);
 await as('anon');await expect(db.query('SELECT * FROM registrations')).rejects.toThrow(/permission denied/);
});
