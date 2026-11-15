import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {beforeAll,afterAll,expect,it} from 'vitest';
const db=new PGlite();
const owner='00000000-0000-0000-0000-000000000001',admin='00000000-0000-0000-0000-000000000002',staff='00000000-0000-0000-0000-000000000003',cr='00000000-0000-0000-0000-000000000004',coordinator='00000000-0000-0000-0000-000000000005';
const claims=(id:string)=>db.query("select set_config('test.uid',$1,false)",[id]);
beforeAll(async()=>{
 // Cryptographic implementation belongs to pgcrypto. These test doubles let PGlite exercise RPC authorization, writes and session revocation.
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA extensions;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;CREATE FUNCTION extensions.gen_salt(text)RETURNS text LANGUAGE sql AS $$SELECT 'fixture'::text$$;CREATE FUNCTION extensions.crypt(text,text)RETURNS text LANGUAGE sql STRICT AS $$SELECT '$2$'||$1$$;CREATE FUNCTION admin_is_owner()RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid()='${owner}'::uuid$$;CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_app_meta_data jsonb);CREATE TABLE revoked_sessions(user_id uuid PRIMARY KEY);CREATE FUNCTION revoke_user_sessions(uuid)RETURNS void LANGUAGE sql AS $$INSERT INTO public.revoked_sessions VALUES($1)ON CONFLICT DO NOTHING$$;CREATE FUNCTION log_login_attempt(text,text,text)RETURNS void LANGUAGE sql AS $$SELECT$$;CREATE TABLE admin_users(user_id text PRIMARY KEY,role text,is_primary boolean DEFAULT false);INSERT INTO admin_users(user_id,role)VALUES('${owner}','owner'),('${admin}','admin');CREATE TABLE security_settings(id int PRIMARY KEY,council_password_hash text,council_passcode text,updated_at timestamptz);INSERT INTO security_settings(id)VALUES(1);CREATE FUNCTION get_council_fixture(p_password text)RETURNS boolean LANGUAGE plpgsql SET search_path='' AS $$BEGIN RETURN (SELECT council_password_hash=crypt(p_password,council_password_hash) FROM public.security_settings WHERE id=1);END$$;CREATE TABLE batch_crs(batch text PRIMARY KEY,password text,updated_at timestamptz);CREATE TABLE security_users(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,username text UNIQUE,password_hash text,full_name text,created_by uuid,is_active boolean DEFAULT true,updated_at timestamptz);CREATE TABLE events(id int PRIMARY KEY,coordinator_password text,visible boolean DEFAULT true,special_grouping_enabled boolean DEFAULT false);INSERT INTO events(id,coordinator_password) VALUES(10,'old-password');INSERT INTO auth.users VALUES('${staff}','{"security_username":"guard"}'),('${cr}','{"cr_batch":"2026"}'),('${coordinator}','{"coordinator_event_id":"10"}');ALTER TABLE security_users ENABLE ROW LEVEL SECURITY;ALTER TABLE batch_crs ENABLE ROW LEVEL SECURITY;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261107000003_password_access_center.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261107000004_coordinator_password_reveal.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261107000005_require_recoverable_coordinator_password.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261107000006_portal_password_reveal.sql',import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
it('rejects nonowners for every portal credential mutation',async()=>{await claims(admin);for(const sql of ["select set_council_password('password123')","select set_cr_password('2026','password123')","select remove_cr_access('2026')","select create_security_user('guard','password123','Guard')","select set_security_user_password(1,'password123')","select manage_security_user_access(1,'disable')"]){await expect(db.exec(sql)).rejects.toThrow('Owner access required');}});
it('uses one Council hash and enforces password validation',async()=>{await claims(owner);await expect(db.exec("select set_council_password('short')")).rejects.toThrow('at least 8');await db.exec("select set_council_password('council-secret')");expect((await db.query('select council_passcode from security_settings')).rows[0].council_passcode).toBeNull();expect((await db.query("select verify_council_password('council-secret') as valid")).rows[0].valid).toBe(true);expect((await db.query("select get_council_fixture('council-secret') as valid")).rows[0].valid).toBe(true);expect((await db.query("select verify_council_password('wrong') as valid")).rows[0].valid).toBe(false);});
it('stores new CR credentials as hashes, accepts existing legacy credentials, and revokes rotated or removed access',async()=>{await claims(owner);await db.exec("insert into batch_crs values('legacy','old-password',now());select set_cr_password('2026','batch-secret')");expect((await db.query("select password from batch_crs where batch='2026'")).rows[0].password).not.toBe('batch-secret');expect((await db.query("select verify_cr_login('2026','batch-secret') as valid")).rows[0].valid).toBe(true);expect((await db.query("select verify_cr_login('legacy','old-password') as valid")).rows[0].valid).toBe(true);expect((await db.query('select * from revoked_sessions where user_id=$1',[cr])).rows).toHaveLength(1);await db.exec("select remove_cr_access('2026')");expect((await db.query("select verify_cr_login('2026','batch-secret') as valid")).rows[0].valid).toBe(false);});
it('creates staff accounts, rotates passwords and disables access with session revocation',async()=>{await claims(owner);await db.exec("select create_security_user('guard','guard-secret','Security staff')");expect((await db.query("select authenticate_security_user('guard','guard-secret') as result")).rows[0].result.success).toBe(true);await db.exec("select set_security_user_password(1,'new-secret')");expect((await db.query("select authenticate_security_user('guard','guard-secret') as result")).rows[0].result.success).toBe(false);await db.exec("select manage_security_user_access(1,'disable')");expect((await db.query("select authenticate_security_user('guard','new-secret') as result")).rows[0].result.success).toBe(false);expect((await db.query('select * from revoked_sessions where user_id=$1',[staff])).rows).toHaveLength(1);});
it('restricts credential verification to the server and prevents direct browser revocation calls',async()=>{expect((await db.query("select has_function_privilege('authenticated','verify_cr_login(text,text)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);expect((await db.query("select has_function_privilege('authenticated','revoke_portal_identity(text,text)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);});
it('rejects legacy password writes and requires an atomic owner-readable save',async()=>{
 await claims(owner);
 await expect(db.exec("update events set coordinator_password='blocked-password' where id=10")).rejects.toThrow('owner-readable copy');
 await db.query("select save_coordinator_password_copy('10','rotated-password','v1.fixture.encrypted-copy',$1,null)",[owner]);
 expect((await db.query('select * from revoked_sessions where user_id=$1',[coordinator])).rows).toHaveLength(1);
 expect((await db.query("select coordinator_password from events where id=10")).rows[0].coordinator_password).toBeNull();
 expect((await db.query("select verify_coordinator_password_secure('10','rotated-password') as valid")).rows[0].valid).toBe(true);
});
it('preserves the readable copy against legacy writes, missing copies and mismatched hashes',async()=>{
 await claims(owner);
 await db.query("select save_coordinator_password_copy('10','vault-password','v1.fixture.encrypted-copy',$1,true)",[owner]);
 const copy=(await db.query("select v.password_hash=c.password_hash as matches,v.ciphertext from coordinator_password_vault v join coordinator_credentials c using(event_id) where event_id='10'")).rows[0];
 expect(copy.matches).toBe(true);expect(copy.ciphertext).toBe('v1.fixture.encrypted-copy');
 await db.exec("update events set special_grouping_enabled=false where id=10");expect((await db.query("select * from coordinator_password_vault where event_id='10'")).rows).toHaveLength(1);
 await expect(db.exec("update events set coordinator_password='another-password' where id=10")).rejects.toThrow('owner-readable copy');
 await expect(db.exec("delete from coordinator_password_vault where event_id='10'")).rejects.toThrow('owner-readable copy');
 await expect(db.exec("update coordinator_credentials set password_hash='different-hash' where event_id='10'")).rejects.toThrow('owner-readable copy');
 expect((await db.query("select * from coordinator_password_vault where event_id='10'")).rows).toHaveLength(1);
 expect((await db.query("select has_function_privilege('authenticated','save_coordinator_password_copy(text,text,text,text,boolean)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);
 expect((await db.query("select has_table_privilege('authenticated','coordinator_password_vault','SELECT') as allowed")).rows[0].allowed).toBe(false);
 await expect(db.query("select save_coordinator_password_copy('10','bad-actor-password','v1.fixture.encrypted-copy',$1,true)",[admin])).rejects.toThrow('Owner access required');
});

it('saves Council, CR and staff hashes with matching owner-readable copies atomically',async()=>{
 await claims(owner);
 for(const [portal,id,name,create] of [['council','1',null,false],['cr','vault-batch',null,false],['security','vault-guard','Vault Guard',true]] as const){
  await db.query("select save_portal_password_copy($1,$2,'portal-secret','v1.fixture.encrypted-copy',$3,$4,$5)",[portal,id,owner,name,create]);
  const result=await db.query("select v.password_hash=c.password_hash as matches from portal_password_vault v join portal_password_current c using(portal,identity) where v.portal=$1 and v.identity=$2",[portal,id]);
  expect(result.rows[0].matches).toBe(true);
 }
 expect((await db.query("select verify_council_password('portal-secret') as valid")).rows[0].valid).toBe(true);
 expect((await db.query("select verify_cr_login('vault-batch','portal-secret') as valid")).rows[0].valid).toBe(true);
 expect((await db.query("select authenticate_security_user('vault-guard','portal-secret') as result")).rows[0].result.success).toBe(true);
 await db.exec("select set_cr_password('vault-batch','rotated-secret');select set_security_user_password((select id from security_users where username='vault-guard'),'rotated-secret');select set_council_password('rotated-secret')");
 expect((await db.query('select * from portal_password_vault')).rows).toHaveLength(0);
});
it('rejects unauthorized portal saves and browser vault access',async()=>{
 await expect(db.query("select save_portal_password_copy('council','1','portal-secret','v1.fixture.encrypted-copy',$1,null,false)",[admin])).rejects.toThrow('Owner access required');
 for(const object of ['portal_password_vault','portal_password_current'])expect((await db.query("select has_table_privilege('authenticated',$1,'SELECT') as allowed",[object])).rows[0].allowed).toBe(false);
 expect((await db.query("select has_function_privilege('authenticated','save_portal_password_copy(text,text,text,text,text,text,boolean)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);
});
