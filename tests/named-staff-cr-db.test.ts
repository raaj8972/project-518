import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {afterAll,beforeAll,expect,it} from 'vitest';
const db=new PGlite();
const first='00000000-0000-0000-0000-000000000001',second='00000000-0000-0000-0000-000000000002',outside='00000000-0000-0000-0000-000000000003';
const login=(batch='2021-2022',revoked=false)=>db.query("select set_config('test.jwt',$1,false)",[JSON.stringify({app_metadata:{role:'cr',cr_batch:batch},revoked})]);
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA extensions;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;
 CREATE FUNCTION session_is_current() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT NOT coalesce((auth.jwt()->>'revoked')::boolean,false)$$;
 CREATE FUNCTION is_authorized_admin() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
 CREATE FUNCTION extensions.crypt(text,text) RETURNS text LANGUAGE sql STRICT AS $$SELECT '$2$'||$1$$;
 CREATE FUNCTION log_login_attempt(text,text,text) RETURNS void LANGUAGE sql AS $$SELECT$$;
 CREATE TABLE security_users(id bigint PRIMARY KEY,username text,full_name text,password_hash text,is_active boolean);
 INSERT INTO security_users VALUES(1,'staff-internal','Ravi Guard','$2$4826',true),(2,'disabled','Disabled Guard','$2$4826',false);
 CREATE TABLE batch_crs(batch text PRIMARY KEY);INSERT INTO batch_crs VALUES('2021-2022'),('2022-2023');
 CREATE TABLE profiles(id uuid PRIMARY KEY,batch text,is_approved boolean DEFAULT false);ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 CREATE POLICY public_profiles ON profiles FOR SELECT USING(true);GRANT SELECT ON profiles TO authenticated;
 INSERT INTO profiles(id,batch) VALUES('${first}','2021-2022'),('${second}','2021-2022'),('${outside}','2022-2023');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261107000007_named_staff_batch_cr_access.sql',import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
it('signs in using a staff name or internal identity and PIN without an email',async()=>{
 for(const name of ['Ravi Guard',' ravi guard ','staff-internal'])expect((await db.query("select authenticate_security_user($1,'4826') as result",[name])).rows[0].result).toMatchObject({success:true,user:{username:'staff-internal',full_name:'Ravi Guard'}});
 expect((await db.query("select authenticate_security_user('Ravi Guard','0000') as result")).rows[0].result.success).toBe(false);
 expect((await db.query("select authenticate_security_user('Disabled Guard','4826') as result")).rows[0].result.success).toBe(false);
});
it('limits profile reads to the exact academic batch despite public read policies',async()=>{
 await login();await db.exec('SET ROLE authenticated');
 try{expect((await db.query('select id from profiles order by id')).rows.map(row=>row.id)).toEqual([first,second]);}finally{await db.exec('RESET ROLE');}
});
it('atomically approves the entire own batch and rejects a mixed batch request',async()=>{
 await login();
 expect((await db.query('select cr_approve_batch_profiles($1::uuid[],true) as changed',[[first,second]])).rows[0].changed).toBe(2);
 await db.exec('update profiles set is_approved=false');
 await expect(db.query('select cr_approve_batch_profiles($1::uuid[],true)',[[first,outside]])).rejects.toThrow('outside your batch');
 expect((await db.query('select id from profiles where is_approved')).rows).toHaveLength(0);
 await expect(db.query("select approve_student_profile($1,'2021-2022','',true)",[outside])).rejects.toThrow('outside your batch');
 await db.query("select approve_student_profile($1,'2021-2022','',true)",[first]);
});
it('rejects revoked sessions and batches without configured access',async()=>{
 await login('2021-2022',true);await expect(db.query('select cr_approve_batch_profiles($1::uuid[],true)',[[second]])).rejects.toThrow('Valid CR session');
 await login('unconfigured');await expect(db.query('select cr_approve_batch_profiles($1::uuid[],true)',[[second]])).rejects.toThrow('Valid CR session');
});

it('rejects an unscoped authenticated user for single and bulk approvals',async()=>{
 await db.exec("select set_config('test.jwt','{}',false)");
 await expect(db.query("select approve_student_profile($1,'2021-2022','',true)",[second])).rejects.toThrow('outside your batch');
 await expect(db.query('select cr_approve_batch_profiles($1::uuid[],true)',[[second]])).rejects.toThrow('Valid CR session');
});
