import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import {beforeAll,afterAll,it,expect} from 'vitest';
const db=new PGlite();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',admin='00000000-0000-4000-8000-000000000003';let team:any,request:string,importId:string;
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION session_is_current() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid() IS NOT NULL$$;
 CREATE FUNCTION admin_can_manage_pages(p text[],f text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT current_setting('test.admin',true)='true'$$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),full_name text,batch text,phone text,is_approved boolean,avatar_url text);
 CREATE TABLE student_inbox(id uuid DEFAULT gen_random_uuid(),user_id uuid,kind text,title text,body text,href text,source_key text,UNIQUE(user_id,source_key));
 INSERT INTO auth.users VALUES('${a}'),('${b}'),('${admin}');INSERT INTO profiles VALUES('${a}','Student A','2024','1111111111',true,NULL),('${b}','Student B','2024','2222222222',true,NULL);
 `);
 await db.exec(await readFile('supabase/migrations/20260628000009_student_groups.sql','utf8'));await db.exec('GRANT ALL ON profiles,student_groups,student_group_members TO authenticated;');
 for(const file of ['20261123060000_iqmg_identity_roster.sql','20261123070000_iqmg_team_requests.sql']){const sql=await readFile('supabase/migrations/'+file,'utf8');await db.exec(sql);await db.exec(sql);}
},20000);
afterAll(()=>db.close());
async function actor<T>(id:string,staff:boolean,fn:()=>Promise<T>){await db.query("SELECT set_config('test.uid',$1,false),set_config('test.admin',$2,false)",[id,String(staff)]);await db.exec('SET ROLE authenticated');try{return await fn();}finally{await db.exec('RESET ROLE');}}
async function rpc(name:string,args:any[]=[]){return(await db.query<{value:any}>(`SELECT ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;}
it('reserves one IQMG number, hides claims from other accounts, and prevents duplicate self-claims',async()=>{
 await actor(b,false,()=>rpc('claim_student_iqmg',['1122']));await actor(a,false,async()=>{await expect(rpc('claim_student_iqmg',['11-22'])).rejects.toThrow(/already in use/);expect((await db.query('SELECT * FROM student_iqmg_identities')).rows).toHaveLength(0);await expect(db.exec("INSERT INTO student_iqmg_identities(user_id,iqmg_number,status) VALUES('"+a+"','9999','verified')")).rejects.toThrow(/permission denied/);});
});
it('allows only reviewed PDF imports to correct a mistaken claim and verify exact matching accounts',async()=>{
 importId=(await db.query<{id:string}>(`INSERT INTO iqmg_roster_imports(created_by,file_name,file_sha256,rows) VALUES($1,'college.pdf','test', $2::jsonb) RETURNING id`,[admin,JSON.stringify([{iqmg_number:'1122',full_name:'Student A',batch:'2024'},{iqmg_number:'3344',full_name:'Student B',batch:'2024'}])])).rows[0].id;
 await actor(a,false,()=>expect(rpc('preview_iqmg_roster',[importId])).rejects.toThrow(/Student management/));
 await actor(admin,true,async()=>{const preview=await rpc('preview_iqmg_roster',[importId]);expect(preview[0]).toMatchObject({status:'matched',current_claimant:'Student B'});const result=await rpc('apply_iqmg_roster',[importId,[1,2]]);expect(result).toMatchObject({verified:2,corrected_claims:1});});
 await actor(a,false,async()=>{expect(await rpc('get_my_iqmg_identity')).toMatchObject({iqmg_number:'1122',status:'verified'});await expect(rpc('claim_student_iqmg',['8888'])).rejects.toThrow(/only be corrected/);});
});
it('never automatically chooses between duplicate names or conflicting rows in a PDF',async()=>{
 const id=(await db.query<{id:string}>(`INSERT INTO iqmg_roster_imports(created_by,file_name,file_sha256,rows) VALUES($1,'bad.pdf','test',$2::jsonb) RETURNING id`,[admin,JSON.stringify([{iqmg_number:'5566',full_name:'Student A'},{iqmg_number:'7788',full_name:'Student A'}])])).rows[0].id;
 await actor(admin,true,async()=>{expect((await rpc('preview_iqmg_roster',[id]))[0].status).toBe('ambiguous');await expect(rpc('apply_iqmg_roster',[id,[1]])).rejects.toThrow(/Ambiguous/);});
});
it('creates a unique team ID and performs exact IQMG lookup without contact details',async()=>{
 await actor(a,false,async()=>{team=await rpc('create_student_team',['Campus Crew']);expect(team.team_code).toMatch(/^TEAM-[A-F0-9]{10}$/);const person=await rpc('find_student_by_iqmg',['3344']);expect(person.full_name).toBe('Student B');expect(person).not.toHaveProperty('phone');expect(person).not.toHaveProperty('email');expect(await rpc('find_student_by_iqmg',['334'])).toBeNull();});
});
it('requires invitee consent and prevents captains and strangers from forging accepted memberships',async()=>{
 await actor(a,false,async()=>{request=await rpc('start_student_team_request',[team.id,'invite','3344']);await expect(rpc('respond_student_team_request',[request,true])).rejects.toThrow(/cannot respond/);await expect(db.exec(`INSERT INTO student_group_members(group_id,user_id,status) VALUES('${team.id}','${b}','accepted')`)).rejects.toThrow(/permission denied/);});
 await actor(b,false,async()=>{expect((await rpc('get_student_team_workspace')).teams).toHaveLength(0);await rpc('respond_student_team_request',[request,true]);expect((await rpc('get_student_team_workspace')).teams[0].members).toHaveLength(2);});
});
it('requires captain approval for a student-initiated team ID request',async()=>{
 let another:any;await actor(a,false,async()=>{another=await rpc('create_student_team',['Second Crew']);});
 await actor(b,false,async()=>{const found=await rpc('find_student_team',[another.team_code.toLowerCase()]);expect(found.name).toBe('Second Crew');expect(found).not.toHaveProperty('members');request=await rpc('start_student_team_request',[another.id,'join',null]);await expect(rpc('respond_student_team_request',[request,true])).rejects.toThrow(/cannot respond/);});
 await actor(a,false,()=>rpc('respond_student_team_request',[request,true]));await actor(b,false,async()=>expect((await rpc('get_student_team_workspace')).teams).toHaveLength(2));
});
it('expires requests and blocks repeat requests immediately after a decline',async()=>{
 let t:any;await actor(a,false,async()=>{t=await rpc('create_student_team',['Expiry Crew']);request=await rpc('start_student_team_request',[t.id,'invite','3344']);});
 await db.query("UPDATE student_team_requests SET expires_at=now()-interval '1 minute' WHERE id=$1",[request]);await actor(b,false,()=>expect(rpc('respond_student_team_request',[request,true])).rejects.toThrow(/expired/));
 await actor(a,false,async()=>{request=await rpc('start_student_team_request',[t.id,'invite','3344']);});await actor(b,false,()=>rpc('respond_student_team_request',[request,false]));await actor(a,false,()=>expect(rpc('start_student_team_request',[t.id,'invite','3344'])).rejects.toThrow(/24 hours/));
});

it('verifies IQMG without bypassing account approval, and refuses conflicting rows for the same account',async()=>{
 const c='00000000-0000-4000-8000-000000000004';await db.query("INSERT INTO auth.users VALUES($1)",[c]);await db.query("INSERT INTO profiles(id,full_name,batch,is_approved) VALUES($1,'Student C','2025',false)",[c]);
 const id=(await db.query<{id:string}>(`INSERT INTO iqmg_roster_imports(created_by,file_name,file_sha256,rows) VALUES($1,'c.pdf','test',$2::jsonb) RETURNING id`,[admin,JSON.stringify([{iqmg_number:'009988',full_name:'Student C',batch:'2025'}])])).rows[0].id;
 await actor(admin,true,()=>rpc('apply_iqmg_roster',[id,[1]]));expect((await db.query('SELECT is_approved FROM profiles WHERE id=$1',[c])).rows[0].is_approved).toBe(false);await actor(c,false,()=>expect(rpc('create_student_team',['Impersonation'])).rejects.toThrow(/approved student/));
 const dup=(await db.query<{id:string}>(`INSERT INTO iqmg_roster_imports(created_by,file_name,file_sha256,rows) VALUES($1,'conflict.pdf','test',$2::jsonb) RETURNING id`,[admin,JSON.stringify([{iqmg_number:'7788',full_name:'Student C',batch:''},{iqmg_number:'6655',full_name:'Student C',batch:'2025'}])])).rows[0].id;await actor(admin,true,async()=>{expect((await rpc('preview_iqmg_roster',[dup])).every((row:any)=>row.status==='ambiguous')).toBe(true);await expect(rpc('apply_iqmg_roster',[id,[999]])).rejects.toThrow(/valid roster rows/);});
});
it('prevents browsing a team roster before acceptance and limits exact identifier lookup attempts',async()=>{
 const c='00000000-0000-4000-8000-000000000004';await db.query('UPDATE profiles SET is_approved=true WHERE id=$1',[c]);await actor(c,false,async()=>{expect((await db.query('SELECT * FROM student_groups')).rows).toHaveLength(0);expect((await db.query('SELECT * FROM student_group_members')).rows).toHaveLength(0);for(let n=0;n<30;n++)expect(await rpc('find_student_by_iqmg',['UNKNOWN'+n])).toBeNull();await expect(rpc('find_student_by_iqmg',['1122'])).rejects.toThrow(/Too many requests/);});
});
