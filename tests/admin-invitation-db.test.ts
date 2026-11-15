import {afterAll,beforeAll,expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const owner='00000000-0000-0000-0000-000000000001',admin='00000000-0000-0000-0000-000000000002',invitee='00000000-0000-0000-0000-000000000003';
beforeAll(async()=>{
 const flags=['events','schedule','gallery','sponsors','registrations','registration_photos','faculty','core_team','sports','guest_artists','chief_guests','homebound','security_passes'];
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);CREATE TABLE auth.sessions(user_id uuid);CREATE TABLE auth.refresh_tokens(user_id text);CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT (auth.jwt()->>'sub')::uuid$$;CREATE TABLE admin_users(user_id text PRIMARY KEY,email text,display_name text,role text,is_primary boolean DEFAULT false);CREATE TABLE admin_permissions(user_id text PRIMARY KEY,email text,${flags.map(flag=>`can_${flag} boolean NOT NULL DEFAULT false`).join(',')});CREATE TABLE allowed_admins(id text PRIMARY KEY,email text);CREATE TABLE user_session_revocations(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,revoked_at timestamptz DEFAULT now());CREATE FUNCTION revoke_user_sessions(p_user_id uuid) RETURNS void LANGUAGE plpgsql AS $$BEGIN INSERT INTO user_session_revocations(user_id)VALUES(p_user_id)ON CONFLICT(user_id)DO UPDATE SET revoked_at=now();DELETE FROM auth.sessions WHERE user_id=p_user_id;DELETE FROM auth.refresh_tokens WHERE user_id=p_user_id::text;END;$$;CREATE TABLE events(id int PRIMARY KEY,title text);ALTER TABLE events ENABLE ROW LEVEL SECURITY;CREATE POLICY baseline_events ON events FOR ALL TO authenticated USING(true)WITH CHECK(true);GRANT ALL ON events TO authenticated;ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;CREATE POLICY baseline_users ON admin_users FOR ALL TO authenticated USING(true)WITH CHECK(true);CREATE POLICY baseline_permissions ON admin_permissions FOR ALL TO authenticated USING(true)WITH CHECK(true);GRANT ALL ON admin_users,admin_permissions TO authenticated;INSERT INTO auth.users VALUES('${owner}','owner@example.test'),('${admin}','admin@example.test'),('${invitee}','invite@example.test');INSERT INTO admin_users(user_id,email,role)VALUES('${owner}','owner@example.test','owner'),('${admin}','admin@example.test','admin');INSERT INTO admin_permissions(user_id,email)VALUES('${admin}','admin@example.test');INSERT INTO events VALUES(1,'Original');`);
 for(const file of ['20261107000000_admin_reset_tokens.sql','20261107000001_admin_reset_otp.sql','20261107000002_admin_invitations.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
});
afterAll(async()=>{await db.close();});
async function pending(email:string,token:string,expires="now()+interval '24 hours'"){
 return (await db.query<{id:string}>(`INSERT INTO admin_invitations(email,display_name,role,allowed_pages,permission_flags,token_hash,invited_by,expires_at)VALUES($1,'Invitee','admin',ARRAY['gallery'],'{"can_gallery":true}',$2,$3,${expires})RETURNING id`,[email,token,owner])).rows[0].id;
}
it('claims an invitation only once and refuses expired/cancelled invitations',async()=>{
 await pending('claim@example.test','claim');expect((await db.query("select * from claim_admin_invitation('claim')")).rows).toHaveLength(1);expect((await db.query("select * from claim_admin_invitation('claim')")).rows).toHaveLength(0);
 await pending('expired@example.test','expired',"now()-interval '1 second'");expect((await db.query("select * from claim_admin_invitation('expired')")).rows).toHaveLength(0);expect((await db.query("select * from claim_admin_invitation('cancelled')")).rows).toHaveLength(0);
});
it('keeps invitations inactive until accepted and activates exactly the assigned pages',async()=>{
 const id=await pending('invite@example.test','activate');expect((await db.query('select * from admin_users where user_id=$1',[invitee])).rows).toHaveLength(0);
 await db.query("select * from claim_admin_invitation('activate')");await db.query('select activate_admin_invitation($1,$2)',[id,invitee]);
 const permission=(await db.query('select allowed_pages,page_access_configured,can_gallery,can_events from admin_permissions where user_id=$1',[invitee])).rows[0];expect(permission).toEqual({allowed_pages:['gallery'],page_access_configured:true,can_gallery:true,can_events:false});expect((await db.query('select * from admin_invitations where id=$1',[id])).rows).toHaveLength(0);
 await expect(db.query('select activate_admin_invitation($1,$2)',[id,invitee])).rejects.toThrow();
});
it('enforces assigned management writes and prevents admins granting themselves more access',async()=>{
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:invitee,iat:Math.floor(Date.now()/1000)})]);
 expect((await db.query("select admin_can_manage_pages(ARRAY['gallery'],ARRAY['can_gallery']) as allowed")).rows[0].allowed).toBe(true);
 expect((await db.query("select admin_can_manage_pages(ARRAY['events'],ARRAY['can_events']) as allowed")).rows[0].allowed).toBe(false);
 await db.exec('SET ROLE authenticated');
 try{expect((await db.query("update events set title='Denied' where id=1 returning id")).rows).toHaveLength(0);expect((await db.query("update admin_permissions set allowed_pages=ARRAY['events'] where user_id=$1 returning user_id",[invitee])).rows).toHaveLength(0);}
 finally{await db.exec('RESET ROLE');}
 expect((await db.query('select title from events where id=1')).rows[0].title).toBe('Original');
});
it('allows an admin to update their own display name while refusing self-promotion',async()=>{
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:invitee,iat:Math.floor(Date.now()/1000)})]);await db.exec('SET ROLE authenticated');
 try{expect((await db.query("update admin_users set display_name='Updated name' where user_id=$1 returning user_id",[invitee])).rows).toHaveLength(1);await expect(db.query("update admin_users set role='owner' where user_id=$1",[invitee])).rejects.toThrow();}
 finally{await db.exec('RESET ROLE');}
});
it('removes membership, permissions, Google access, invitations and sessions, retaining a JWT revocation tombstone',async()=>{
 await db.query('insert into allowed_admins values($1,$2)',['admin','admin@example.test']);await pending('admin@example.test','revoke');await db.query('insert into auth.sessions values($1)',[admin]);await db.query('insert into auth.refresh_tokens values($1)',[admin]);
 await db.query('select revoke_admin_account($1)',[admin]);
 for(const table of ['admin_users','admin_permissions'])expect((await db.query(`select * from ${table} where user_id=$1`,[admin])).rows).toHaveLength(0);
 expect((await db.query("select * from allowed_admins where email='admin@example.test'")).rows).toHaveLength(0);expect((await db.query("select * from admin_invitations where email='admin@example.test'")).rows).toHaveLength(0);expect((await db.query('select * from auth.sessions where user_id=$1',[admin])).rows).toHaveLength(0);
 await db.query('delete from auth.users where id=$1',[admin]);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:admin,iat:Math.floor(Date.now()/1000)})]);expect((await db.query('select session_is_current() as allowed')).rows[0].allowed).toBe(false);
});
it('protects owner accounts from removal and denies browser access to invitation mutation RPCs',async()=>{
 await expect(db.query('select revoke_admin_account($1)',[owner])).rejects.toThrow('Owner accounts cannot be removed');
 expect((await db.query("select has_function_privilege('authenticated','claim_admin_invitation(text)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);
 expect((await db.query("select has_table_privilege('anon','admin_invitations','SELECT') as allowed")).rows[0].allowed).toBe(false);
});
