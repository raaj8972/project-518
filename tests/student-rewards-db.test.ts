import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {afterAll,beforeAll,expect,it} from 'vitest';
const db=new PGlite();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',staff='00000000-0000-4000-8000-000000000003';
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION session_is_current() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() IS NOT NULL $$;
 CREATE FUNCTION coordinates_event(e text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.role',true)='coordinator' AND current_setting('test.event',true)=e $$;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.role',true)='owner' $$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 CREATE TABLE homepage_settings(id integer PRIMARY KEY,brand_year integer);INSERT INTO homepage_settings VALUES(1,2026);
 CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),full_name text,username text,avatar_url text,aura_color text,background_url text,batch text,phone text,is_approved boolean,likes_count integer DEFAULT 0);
 CREATE TABLE events(id text PRIMARY KEY,title text,date text);
 CREATE TABLE registrations(id text PRIMARY KEY,event_id text,user_id uuid,status text,deleted_at timestamptz);
 CREATE TABLE event_rounds(id uuid PRIMARY KEY,event_id text,name text);
 CREATE TABLE registration_rounds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),registration_id text,round_id uuid,status text,prize_rank text);
 CREATE TABLE student_activity_log(id uuid DEFAULT gen_random_uuid(),user_id uuid,xp_earned integer);
 CREATE TABLE student_xp(id uuid PRIMARY KEY REFERENCES profiles(id),xp_total integer,tier text,updated_at timestamptz DEFAULT now());
 CREATE TABLE profile_likes(liker_id uuid,profile_id uuid,PRIMARY KEY(liker_id,profile_id));
 GRANT SELECT,INSERT,DELETE ON profile_likes TO authenticated;
 GRANT ALL ON student_xp,student_activity_log,registration_rounds TO authenticated; GRANT SELECT ON registrations,event_rounds TO authenticated;
 ALTER TABLE registration_rounds ENABLE ROW LEVEL SECURITY;CREATE POLICY legacy_round_access ON registration_rounds USING(true) WITH CHECK(true);
 INSERT INTO auth.users VALUES('${a}'),('${b}'),('${staff}');
 INSERT INTO profiles(id,full_name,batch,phone,is_approved,likes_count) VALUES('${a}','Festival Participant','2nd Prof','9999999999',true,200),('${b}','Another Participant','2nd Prof','8888888888',true,0);
 INSERT INTO student_xp VALUES('${a}',9000,'elite',now());
 INSERT INTO events VALUES('one','Dance','2026-11-23'),('two','Band','2026-11-24'),('three','Quiz','2026-11-25'),('four','Debate','2026-11-26'),('past','Past stage','2025-11-23');
 INSERT INTO registrations VALUES('a1','one','${a}','approved',NULL),('a2','two','${a}','approved',NULL),('a3','three','${a}','approved',NULL),('a4','four','${a}','approved',NULL),('duplicate','one','${a}','approved',NULL),('b1','one','${b}','approved',NULL),('past','past','${a}','approved',NULL);
 INSERT INTO event_rounds VALUES('10000000-0000-4000-8000-000000000001','one','Prelims'),('10000000-0000-4000-8000-000000000002','one','Finals'),('10000000-0000-4000-8000-000000000003','one','Semifinal');
 `);
 const baseline=await readFile('supabase/migrations/20260326000000_baseline.sql','utf8');
 for(const name of ['award_xp','trg_update_profile_likes','trg_xp_multi_event','trg_xp_on_reg_approve']) {
  const start=baseline.indexOf(`CREATE OR REPLACE FUNCTION "public"."${name}"(`);const end=baseline.indexOf('$$;',start)+3;await db.exec(baseline.slice(start,end));
 }
 await db.exec(`CREATE TRIGGER trg_profile_likes AFTER INSERT OR DELETE ON profile_likes FOR EACH ROW EXECUTE FUNCTION trg_update_profile_likes();
 CREATE TRIGGER trg_xp_multi_event AFTER INSERT ON registrations FOR EACH ROW EXECUTE FUNCTION trg_xp_multi_event();
 CREATE TRIGGER trg_xp_registration AFTER UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION trg_xp_on_reg_approve();`);
 const sql=await readFile('supabase/migrations/20261123030000_student_rewards_and_onboarding.sql','utf8');await db.exec(sql);await db.exec(sql);
},20000);
afterAll(()=>db.close());
async function actor<T>(id:string,role:string,event:string,action:()=>Promise<T>){await db.query("SELECT set_config('test.uid',$1,false),set_config('test.role',$2,false),set_config('test.event',$3,false)",[id,role,event]);await db.exec('SET ROLE authenticated');try{return await action();}finally{await db.exec('RESET ROLE');}}
async function score(id=a,year=2026){return (await db.query<{s:any}>('SELECT get_student_scoreboard($1) AS s',[year])).rows[0].s.students.find((s:any)=>s.id===id);}
it('preserves legacy history while starting verified XP with a once-only complete-profile award',async()=>{
 expect((await db.query('SELECT xp_total FROM student_legacy_xp_snapshot WHERE user_id=$1',[a])).rows[0]).toEqual({xp_total:9000});
 expect((await score()).xp).toBe(50);expect((await score()).hype_score).toBe(0);expect((await score()).rank).toBe(0);
 await actor(a,'student','',async()=>{await db.exec('SELECT refresh_student_rewards();SELECT refresh_student_rewards();');});
 expect((await score()).xp).toBe(50);
});
it('limits daily check-ins, forbids arbitrary XP and other-account rewards, and gives no XP for likes',async()=>{
 await actor(a,'student','',async()=>{
  await db.query("SELECT award_xp($1,'daily_checkin',5,'{}')",[a]);await db.query("SELECT award_xp($1,'daily_checkin',5,'{}')",[a]);
  await db.query("SELECT award_xp($1,'profile_like_interaction',2,'{}')",[a]);
  await expect(db.query("SELECT award_xp($1,'daily_checkin',999,'{}')",[a])).rejects.toThrow(/Invalid XP/);
  await expect(db.query("SELECT award_xp($1,'daily_checkin',5,'{}')",[b])).rejects.toThrow(/own approved/);
  await expect(db.exec(`UPDATE student_xp SET xp_total=99999`)).rejects.toThrow(/permission denied/);
 });expect((await score()).xp).toBe(55);expect((await score()).hype_score).toBe(0);
});
it('requires coordinator verification, deduplicates entries, and caps competitive points at the best three events',async()=>{
 await actor(a,'student','',()=>expect(db.exec("SELECT verify_student_participation('a1',true)")).rejects.toThrow(/coordinator/));
 await actor(staff,'coordinator','two',()=>expect(db.exec("SELECT verify_student_participation('a1',true)")).rejects.toThrow(/coordinator/));
 await actor(staff,'owner','',()=>db.exec("SELECT verify_student_participation('a1',true);SELECT verify_student_participation('duplicate',true);SELECT verify_student_participation('a2',true);SELECT verify_student_participation('a3',true);SELECT verify_student_participation('a4',true);SELECT verify_student_participation('b1',true);"));
 expect((await score()).hype_score).toBe(60);expect((await score()).verified_events).toBe(4);expect((await score()).xp).toBe(455);
 expect((await score(b)).hype_score).toBe(20);
});
it('counts each real round, recognises semifinals correctly, and awards only the highest placement once',async()=>{
 await actor(staff,'coordinator','one',()=>db.exec(`INSERT INTO registration_rounds(registration_id,round_id,status,prize_rank) VALUES
 ('a1','10000000-0000-4000-8000-000000000001','qualified','3rd'),('a1','10000000-0000-4000-8000-000000000002','qualified','1st'),('duplicate','10000000-0000-4000-8000-000000000002','qualified','1st'),('a1','10000000-0000-4000-8000-000000000003','qualified',NULL);`));
 const s=await score();expect(s.hype_score).toBe(150);expect(s.points_breakdown.rounds).toBe(20);expect(s.points_breakdown.finalRound).toBe(20);expect(s.points_breakdown.prizes).toBe(50);expect(s.xp).toBe(605);
 await actor(b,'student','',()=>expect(db.exec("INSERT INTO registration_rounds(registration_id,round_id,status) VALUES('b1','10000000-0000-4000-8000-000000000001','qualified')")).rejects.toThrow(/row.level security/));
});
it('keeps past editions separate and ties ranked equally without likes affecting the result',async()=>{
 await actor(staff,'owner','',()=>db.exec("SELECT verify_student_participation('past',true)"));
 expect((await score(a,2025)).hype_score).toBe(20);expect((await score()).hype_score).toBe(150);
 await db.exec("UPDATE registrations SET status='rejected' WHERE id IN('a1','duplicate','a2','a3');");
 expect((await score()).hype_score).toBe(20);expect((await score()).rank).toBe((await score(b)).rank);
 expect((await score()).likes_count).toBe(200);
});
it('persists completed/skipped tours per account and rejects cross-account writes',async()=>{
 await actor(a,'student','',()=>db.exec(`INSERT INTO student_dashboard_onboarding(user_id,status) VALUES('${a}','skipped')`));
 await actor(b,'student','',async()=>{expect((await db.query('SELECT * FROM student_dashboard_onboarding')).rows).toHaveLength(0);await expect(db.exec(`INSERT INTO student_dashboard_onboarding(user_id,status) VALUES('${a}','completed')`)).rejects.toThrow(/row.level security/);});
});

it('requires both 1,000 verified XP and two events for Elite',async()=>{
 await db.exec(`INSERT INTO event_rounds SELECT gen_random_uuid(),'one','Test round '||n FROM generate_series(1,20) n;`);
 await actor(staff,'owner','',()=>db.exec(`INSERT INTO registration_rounds(registration_id,round_id,status) SELECT 'b1',id,'qualified' FROM event_rounds WHERE name LIKE 'Test round%';`));
 expect((await score(b)).xp).toBeGreaterThanOrEqual(1000);expect((await score(b)).tier).toBe('gold');
 await db.exec(`INSERT INTO registrations VALUES('b2','two','${b}','approved',NULL)`);
 await actor(staff,'owner','',()=>db.exec("SELECT verify_student_participation('b2',true)"));expect((await score(b)).tier).toBe('elite');
});
it('keeps likes and registration approvals working after retiring their legacy XP triggers',async()=>{
 const beforeA=(await score(a)).xp,beforeB=(await score(b)).xp;
 await actor(a,'student','',()=>db.exec(`INSERT INTO profile_likes VALUES('${a}','${b}')`));
 expect((await score(b)).likes_count).toBe(1);expect((await score(b)).xp).toBe(beforeB);
 await actor(a,'student','',()=>db.exec(`DELETE FROM profile_likes WHERE liker_id='${a}' AND profile_id='${b}'`));
 expect((await score(b)).likes_count).toBe(0);
 await db.exec(`INSERT INTO registrations VALUES('new-pending','three','${b}','pending',NULL);UPDATE registrations SET status='approved' WHERE id='new-pending';`);
 expect((await score(a)).xp).toBe(beforeA);expect((await score(b)).xp).toBe(beforeB);
});
