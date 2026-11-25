import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db = new PGlite();
const student='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002', staff='00000000-0000-4000-8000-000000000003';
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT jsonb_build_object('role',coalesce(current_setting('test.jwt_role',true),'authenticated'))$$;
 CREATE FUNCTION session_is_current() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid() IS NOT NULL AND coalesce(current_setting('test.valid',true),'true')='true'$$;
 CREATE FUNCTION coordinates_event(id text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT current_setting('test.role',true)='coordinator' AND id=current_setting('test.event',true)$$;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT current_setting('test.role',true) IN('owner','events-admin','registration-admin')$$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 CREATE TABLE events(id text PRIMARY KEY,title text,whatsapp_group_link text);
 CREATE TABLE registrations(id text PRIMARY KEY,event_id text REFERENCES events(id),user_id uuid,status text,is_active boolean,deleted_at timestamptz);
 GRANT SELECT ON events TO anon;GRANT SELECT,INSERT,UPDATE,DELETE ON events TO authenticated;
 INSERT INTO events VALUES('dance','Dance','https://chat.whatsapp.com/DanceInvite'),('band','Band','https://chat.whatsapp.com/BandInvite');
 INSERT INTO registrations VALUES('mine','dance','${student}','pending',false,NULL),('theirs','band','${other}','approved',true,NULL);
 `);
 const migration=await readFile('supabase/migrations/20261123043000_protect_event_whatsapp_groups.sql','utf8');await db.exec(migration);await db.exec(migration);
},20000);
afterAll(()=>db.close());
async function actor<T>(uid:string,role:string,event:string,action:()=>Promise<T>){await db.query("SELECT set_config('test.uid',$1,false),set_config('test.role',$2,false),set_config('test.event',$3,false),set_config('test.valid','true',false)",[uid,role,event]);await db.exec('SET ROLE authenticated');try{return await action();}finally{await db.exec('RESET ROLE');await db.exec("SELECT set_config('test.uid','',false)");}}
async function groups(){return(await db.query('SELECT event_id,whatsapp_group_link FROM event_whatsapp_groups ORDER BY event_id')).rows;}
it('moves existing links out of every public event row and denies anonymous private reads',async()=>{
 expect((await db.query('SELECT whatsapp_group_link FROM events')).rows.every((row:any)=>row.whatsapp_group_link===null)).toBe(true);
 expect(await groups()).toHaveLength(2);
 await db.exec('SET ROLE anon');try{await expect(groups()).rejects.toThrow(/permission denied/);expect(JSON.stringify((await db.query('SELECT row_to_json(e) FROM events e')).rows)).not.toContain('DanceInvite');}finally{await db.exec('RESET ROLE');}
});
it('hides pending, payment-pending, and other students registrations until approval',async()=>{
 await actor(student,'student','',async()=>{expect(await groups()).toEqual([]);});
 await db.exec("UPDATE registrations SET status='payment_pending' WHERE id='mine'");
 await actor(student,'student','',async()=>{expect(await groups()).toEqual([]);});
 await db.exec("UPDATE registrations SET status='approved',is_active=true WHERE id='mine'");
 await actor(student,'student','',async()=>{expect(await groups()).toEqual([{event_id:'dance',whatsapp_group_link:'https://chat.whatsapp.com/DanceInvite'}]);});
 await actor(other,'student','',async()=>{expect((await groups()).map((row:any)=>row.event_id)).toEqual(['band']);});
});
it('revokes access immediately when rejected, cancelled, deactivated, deleted, or session-invalid',async()=>{
 for(const status of ['rejected','cancelled','pending']){
  await db.query("UPDATE registrations SET status=$1 WHERE id='mine'",[status]);await actor(student,'student','',async()=>expect(await groups()).toEqual([]));
 }
 await db.exec("UPDATE registrations SET status='approved',is_active=false WHERE id='mine'");await actor(student,'student','',async()=>expect(await groups()).toEqual([]));
 await db.exec("UPDATE registrations SET is_active=true,deleted_at=now() WHERE id='mine'");await actor(student,'student','',async()=>expect(await groups()).toEqual([]));
 await db.exec("UPDATE registrations SET deleted_at=NULL WHERE id='mine'");
 await actor(student,'student','',async()=>{await db.exec("SELECT set_config('test.valid','false',false)");expect(await groups()).toEqual([]);});
});
it('keeps coordinator updates private and scoped, including blank-link removal',async()=>{
 await actor(staff,'coordinator','dance',async()=>{
  expect((await groups()).map((row:any)=>row.event_id)).toEqual(['dance']);
  await db.exec("UPDATE events SET whatsapp_group_link='https://chat.whatsapp.com/NewDanceInvite' WHERE id='dance'");
  expect((await groups())[0]).toMatchObject({whatsapp_group_link:'https://chat.whatsapp.com/NewDanceInvite'});
  await expect(db.exec("UPDATE events SET whatsapp_group_link='https://chat.whatsapp.com/Forbidden' WHERE id='band'")).rejects.toThrow(/coordinator or event administrator/);
  await expect(db.exec("INSERT INTO event_whatsapp_groups VALUES('dance','https://chat.whatsapp.com/Forged',now())")).rejects.toThrow(/permission denied/);
  await db.exec("UPDATE events SET title='New title' WHERE id='dance'");expect(await groups()).toHaveLength(1);
  await db.exec("UPDATE events SET whatsapp_group_link='' WHERE id='dance'");expect(await groups()).toEqual([]);
 });
 expect((await db.query('SELECT whatsapp_group_link FROM events')).rows.every((row:any)=>row.whatsapp_group_link===null)).toBe(true);
});
it('allows authorised admin forms to create linked events atomically without returning the private URL',async()=>{
 await actor(staff,'owner','',async()=>{
  const saved=await db.query("INSERT INTO events VALUES('quiz','Quiz','https://chat.whatsapp.com/QuizInvite') RETURNING *");expect(saved.rows[0]).toMatchObject({whatsapp_group_link:null});
  expect((await groups()).map((row:any)=>row.event_id)).toContain('quiz');
 });
 await actor(student,'student','',()=>expect(db.exec("UPDATE events SET whatsapp_group_link='https://chat.whatsapp.com/Forged' WHERE id='dance'")).rejects.toThrow(/coordinator or event administrator/));
});
