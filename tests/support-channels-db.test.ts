import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll,beforeAll,expect,it } from 'vitest';
const db=new PGlite();
const student='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002', coord='00000000-0000-4000-8000-000000000003', tech='00000000-0000-4000-8000-000000000004';
let eventChat:string,technicalChat:string;
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION session_is_current() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() IS NOT NULL AND coalesce(current_setting('test.expired',true),'')<>'true' $$;
 CREATE FUNCTION coordinates_event(e text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT session_is_current() AND current_setting('test.role',true)='coordinator' AND current_setting('test.event',true)=e $$;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT session_is_current() AND current_setting('test.role',true) IN('owner','tech') $$;
 CREATE TYPE public.sender_role_type AS ENUM('student','admin','coordinator');
 CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text);
 CREATE TABLE events(id text PRIMARY KEY,title text,visible boolean DEFAULT true);
 CREATE TABLE registrations(id text,event_id text,user_id uuid,deleted_at timestamptz);
 CREATE TABLE conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid,coordinator_id uuid,event_id text,created_at timestamptz DEFAULT now());
 CREATE TABLE chat_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid REFERENCES conversations(id),sender_id uuid,sender_role sender_role_type,text text,read_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),expires_at timestamptz DEFAULT now()+interval '5 days');
 CREATE TABLE site_settings(chat_locked boolean); INSERT INTO site_settings VALUES(false);
 CREATE TABLE student_inbox(id uuid DEFAULT gen_random_uuid(),user_id uuid,kind text CHECK(kind IN('registration','invitation','venue','schedule','reminder')),title text,body text,href text,source_key text,created_at timestamptz DEFAULT now(),UNIQUE(user_id,source_key));
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated; GRANT ALL ON conversations,chat_messages TO authenticated;
 ALTER TABLE conversations ENABLE ROW LEVEL SECURITY; ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
 CREATE POLICY unsafe_conversations ON conversations USING(true) WITH CHECK(true); CREATE POLICY unsafe_messages ON chat_messages USING(true) WITH CHECK(true);
 INSERT INTO profiles VALUES('${student}','Festival student'),('${other}','Other student');
 INSERT INTO events VALUES('event-a','Dance',true),('event-b','Debate',true),('hidden','Hidden event',false);
 `);
 const sql=await readFile('supabase/migrations/20261122180000_student_support_channels.sql','utf8');await db.exec(sql);await db.exec(sql);
},15000);
afterAll(()=>db.close());
async function as<T>(id:string,role:string,event:string,action:()=>Promise<T>){
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.role',$2,false),set_config('test.event',$3,false)",[id,role,event]);await db.exec('SET ROLE authenticated');try{return await action();}finally{await db.exec('RESET ROLE');}
}
it('opens distinct technical/event threads and reuses them without creating duplicates',async()=>{
 await as(student,'student','',async()=>{
  eventChat=(await db.query<{id:string}>("SELECT open_student_support('event-a') AS id")).rows[0].id;
  technicalChat=(await db.query<{id:string}>('SELECT open_student_support() AS id')).rows[0].id;
  expect(eventChat).not.toBe(technicalChat);
  expect((await db.query("SELECT open_student_support('event-a') AS id")).rows[0]).toEqual({id:eventChat});
  await expect(db.exec("SELECT open_student_support('hidden')")).rejects.toThrow(/unavailable/);
  await expect(db.exec(`INSERT INTO conversations(student_id,event_id) VALUES('${other}','event-b')`)).rejects.toThrow(/permission denied|row.level security/);
  expect((await db.query('SELECT * FROM conversations')).rows).toHaveLength(2);
 });
});
it('routes student questions to the correct coordinator and the tech team, with no cross-event leaks',async()=>{
 await as(student,'student','',async()=>{await db.query("SELECT support_send_message($1,'student','Where is the stage?')",[eventChat]);await db.query("SELECT support_send_message($1,'student','My pass is not loading')",[technicalChat]);});
 await as(coord,'coordinator','event-a',async()=>{
  expect((await db.query("SELECT id,unread_count FROM support_conversation_list('coordinator','event-a')")).rows).toEqual([{id:eventChat,unread_count:1}]);
  expect((await db.query('SELECT id FROM conversations')).rows).toEqual([{id:eventChat}]);
  await expect(db.query("SELECT support_send_message($1,'coordinator','Wrong inbox')",[technicalChat])).rejects.toThrow(/denied/);
  await expect(db.exec("SELECT * FROM support_conversation_list('coordinator','event-b')")).rejects.toThrow(/assigned event/);
  await expect(db.exec("SELECT * FROM support_conversation_list('admin')")).rejects.toThrow(/Technical support access/);
 });
 await as(tech,'tech','',async()=>{
  expect((await db.query("SELECT id,unread_count FROM support_conversation_list('admin')")).rows).toEqual([{id:technicalChat,unread_count:1}]);
  expect((await db.query('SELECT id FROM conversations')).rows).toEqual([{id:technicalChat}]);
  await expect(db.query("SELECT support_send_message($1,'admin','Wrong event')",[eventChat])).rejects.toThrow(/denied/);
 });
});
it('delivers real replies to the student inbox and persists read receipts',async()=>{
 await as(coord,'coordinator','event-a',()=>db.query("SELECT support_send_message($1,'coordinator','Use Hall A')",[eventChat]));
 await as(tech,'tech','',()=>db.query("SELECT support_send_message($1,'admin','Please refresh your pass page')",[technicalChat]));
 const notices=(await db.query<{user_id:string;kind:string;title:string}>('SELECT user_id,kind,title FROM student_inbox')).rows;
 expect(notices).toHaveLength(2);expect(notices.every(row=>row.user_id===student&&row.kind==='support')).toBe(true);
 expect(notices.map(row=>row.title)).toContain('Technical support replied');
 await as(student,'student','',()=>db.query("SELECT support_mark_read($1,'student')",[technicalChat]));
 const replies=(await db.query("SELECT read_at FROM chat_messages WHERE sender_role='admin'")).rows;
 expect(replies[0].read_at).not.toBeNull();
 await as(tech,'tech','',async()=>{await db.query("SELECT support_mark_read($1,'admin')",[technicalChat]);expect((await db.query("SELECT support_unread_count('admin') AS count")).rows[0]).toEqual({count:0});});
});
it('blocks impersonation, cross-student reads, conversation rerouting and unassigned admins',async()=>{
 await as(other,'student','',async()=>{
  expect((await db.query('SELECT * FROM chat_messages')).rows).toHaveLength(0);
  await expect(db.query("SELECT support_send_message($1,'student','Forged')",[eventChat])).rejects.toThrow(/denied/);
  await expect(db.query("SELECT support_mark_read($1,'student')",[eventChat])).rejects.toThrow(/denied/);
 });
 await as(student,'student','',async()=>{
  await expect(db.query("SELECT support_send_message($1,'admin','Fake tech')",[technicalChat])).rejects.toThrow(/denied/);
  await expect(db.exec("UPDATE conversations SET event_id='event-b'")).rejects.toThrow(/permission denied/);
  await expect(db.exec("UPDATE chat_messages SET sender_role='admin'")).rejects.toThrow(/permission denied/);
 });
 await as(tech,'unassigned-admin','',async()=>{expect((await db.query('SELECT * FROM conversations')).rows).toHaveLength(0);await expect(db.exec("SELECT * FROM support_conversation_list('admin')")).rejects.toThrow(/access required/);});
});
it('enforces the chat lock and lets only the author edit their messages',async()=>{
 const message=(await db.query<{id:string}>("SELECT id FROM chat_messages WHERE sender_role='admin' LIMIT 1")).rows[0].id;
 await as(student,'student','',()=>expect(db.query("SELECT support_edit_message($1,'student','changed')",[message])).rejects.toThrow(/denied/));
 await as(tech,'tech','',()=>db.query("SELECT support_edit_message($1,'admin','Try the refreshed QR pass')",[message]));
 expect((await db.query('SELECT text FROM chat_messages WHERE id=$1',[message])).rows[0]).toEqual({text:'Try the refreshed QR pass'});
 await db.exec('UPDATE site_settings SET chat_locked=true');
 await as(student,'student','',()=>expect(db.query("SELECT support_send_message($1,'student','blocked')",[technicalChat])).rejects.toThrow(/locked/));
 await db.exec('UPDATE site_settings SET chat_locked=false');
});
