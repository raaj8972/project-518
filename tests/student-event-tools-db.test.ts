import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db = new PGlite();
const one='00000000-0000-4000-8000-000000000001';
const two='00000000-0000-4000-8000-000000000002';
beforeAll(async()=>{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    CREATE TABLE public.events(id text PRIMARY KEY,title text,date text,time text,venue text,visible boolean DEFAULT true);
    CREATE TABLE public.registrations(id text PRIMARY KEY,event_id text,event_title text,user_id uuid,status text,deleted_at timestamptz);
    CREATE TABLE public.group_invitations(id uuid PRIMARY KEY,event_id text,sender_id uuid,receiver_id uuid,status text);
    INSERT INTO auth.users VALUES('${one}'),('${two}');
    INSERT INTO public.events VALUES('band','Battle of Bands','2026-11-23','10:00 AM - 2:00 PM','Main Hall',true);
  `);
  const sql=await readFile('supabase/migrations/20261122160000_student_event_tools.sql','utf8');
  await db.exec(sql); await db.exec(sql);
},15000);
afterAll(async()=>db.close());
async function asUser<T>(id:string, action:()=>Promise<T>){
  await db.query("SELECT set_config('test.uid',$1,false)",[id]);await db.exec('SET ROLE authenticated');
  try{return await action();}finally{await db.exec('RESET ROLE');}
}
it('parses real schedule formats in India and refuses unconfirmed or impossible dates',async()=>{
  const {rows}=await db.query<{start:string}>("SELECT public.student_event_start('2026-11-23','10:00 AM - 2:00 PM')::text AS start");
  expect(new Date(rows[0].start).toISOString()).toBe('2026-11-23T04:30:00.000Z');
  expect((await db.query("SELECT public.student_event_start('2026-02-31','10:00') AS invalid,public.student_event_start('2026-11-23','TBA') AS unknown")).rows[0]).toEqual({invalid:null,unknown:null});
});
it('persists favourites per account and prevents cross-account access',async()=>{
  await asUser(one,()=>db.exec(`INSERT INTO public.student_saved_events(user_id,event_id) VALUES('${one}','band')`));
  await asUser(two,async()=>{
    expect((await db.query('SELECT * FROM public.student_saved_events')).rows).toHaveLength(0);
    await expect(db.exec(`INSERT INTO public.student_saved_events(user_id,event_id) VALUES('${one}','band')`)).rejects.toThrow(/row.level security/i);
    await db.exec(`DELETE FROM public.student_saved_events WHERE user_id='${one}'`);
  });
  await asUser(one,async()=>expect((await db.query('SELECT event_id FROM public.student_saved_events')).rows).toEqual([{event_id:'band'}]));
});
it('records status changes, invitations and venue changes without notifying rejected or deleted entries',async()=>{
  await db.exec(`INSERT INTO public.registrations VALUES('r1','band','Battle of Bands','${one}','pending',NULL),('r2','band','Battle of Bands','${two}','rejected',NULL);
    UPDATE public.registrations SET status='approved' WHERE id='r1';
    UPDATE public.events SET venue='Auditorium' WHERE id='band';
    INSERT INTO public.group_invitations VALUES('10000000-0000-4000-8000-000000000001','band','${one}','${two}','pending');
    UPDATE public.group_invitations SET status='accepted';`);
  const {rows}=await db.query<{user_id:string;kind:string;title:string}>('SELECT user_id,kind,title FROM public.student_inbox');
  expect(rows.filter(r=>r.user_id===one&&r.kind==='registration')).toHaveLength(2);
  expect(rows.filter(r=>r.kind==='venue').map(r=>r.user_id)).toEqual([one]);
  expect(rows.filter(r=>r.kind==='invitation').map(r=>r.user_id).sort()).toEqual([one,two]);
});
it('allows only read-state changes to owned inbox rows and forbids forged notifications',async()=>{
  await asUser(one,async()=>{
    await expect(db.exec(`INSERT INTO public.student_inbox(user_id,kind,title,body,href,source_key) VALUES('${one}','registration','Forged','Forged','/dashboard/events','forged')`)).rejects.toThrow(/permission denied/i);
    await expect(db.exec("UPDATE public.student_inbox SET title='Forged'")).rejects.toThrow(/permission denied/i);
    await db.exec('UPDATE public.student_inbox SET read_at=now()');
    expect((await db.query('SELECT * FROM public.student_inbox WHERE read_at IS NULL')).rows).toHaveLength(0);
    await expect(db.exec('SELECT public.deliver_student_reminders()')).rejects.toThrow(/permission denied/i);
  });
  expect((await db.query(`SELECT count(*)::int AS count FROM public.student_inbox WHERE user_id='${two}' AND read_at IS NULL`)).rows[0]).toEqual({count:2});
});
it('delivers one reminder per confirmed start, supports rescheduling and honours opt out',async()=>{
  await db.exec(`UPDATE public.events SET date=to_char((now()+interval '20 minutes') AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD'),time=to_char((now()+interval '20 minutes') AT TIME ZONE 'Asia/Kolkata','HH24:MI:SS') WHERE id='band';`);
  await asUser(one,()=>db.exec('SELECT public.refresh_my_student_reminders()'));
  await db.exec("SET TIME ZONE 'Asia/Kolkata'");
  await asUser(one,()=>db.exec('SELECT public.refresh_my_student_reminders()'));
  await db.exec("SET TIME ZONE 'UTC'");
  expect((await db.query("SELECT count(*)::int AS count FROM public.student_inbox WHERE kind='reminder'")).rows[0]).toEqual({count:1});
  await asUser(one,()=>db.exec(`INSERT INTO public.student_notification_preferences VALUES('${one}',0)`));
  await db.exec(`UPDATE public.events SET time=to_char((now()+interval '25 minutes') AT TIME ZONE 'Asia/Kolkata','HH24:MI:SS') WHERE id='band'; SELECT public.deliver_student_reminders();`);
  expect((await db.query("SELECT count(*)::int AS count FROM public.student_inbox WHERE kind='reminder'")).rows[0]).toEqual({count:1});
  await asUser(one,()=>db.exec('UPDATE public.student_notification_preferences SET reminder_minutes=30; SELECT public.refresh_my_student_reminders();'));
  expect((await db.query("SELECT count(*)::int AS count FROM public.student_inbox WHERE kind='reminder'")).rows[0]).toEqual({count:2});
});
