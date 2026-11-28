import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { secureEvent, secureRequest } from '../netlify/functions/lib/api-security';
import { verifyAdmin, verifyToken } from '../netlify/functions/lib/auth-verify';
import { handler as register } from '../netlify/functions/passkey-register';
import { handler as challenge } from '../netlify/functions/passkey-challenge';
import { handler as listAdmins } from '../netlify/functions/list-admin-users';
import { handler as forceLogout } from '../netlify/functions/force-logout';
import { handler as coordinatorAI } from '../netlify/functions/coordinator-ai-groups';
import { handler as crBatchIqmg } from '../netlify/functions/cr-batch-iqmg';
import { handler as crManageIqmg } from '../netlify/functions/cr-manage-iqmg';
import { fetchImage, allowedMediaUrl } from '../netlify/functions/lib/media-fetch';
import { publicEnvironment } from '../shared/publicEnv';
import { safeInstagramUrl } from '../src/utils/safeInstagramUrl';
import { trustedClientIp } from '../netlify/functions/lib/client-ip';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),rpc:vi.fn(),registration:vi.fn(),authentication:vi.fn()}));
vi.mock('../netlify/functions/lib/supabase',()=>{
 const client={auth:{getUser:mocks.getUser},from:mocks.from,rpc:mocks.rpc};
 return {supabase:client,getSupabaseClient:()=>client};
});
vi.mock('@simplewebauthn/server',()=>({generateRegistrationOptions:mocks.registration,generateAuthenticationOptions:mocks.authentication,verifyRegistrationResponse:vi.fn()}));
const id='00000000-0000-0000-0000-000000000001';
const jwt=(extra:object={})=>`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),...extra})).toString('base64url')}.fixture`;
const token=()=>`Bearer ${jwt()}`;
const run=async(handler:any,body:object={},headers:object={},method='POST')=>handler({httpMethod:method,headers,body:JSON.stringify(body)},{});
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('NODE_ENV','production');
 mocks.getUser.mockResolvedValue({data:{user:{id,email:'raaj@rico.fun'}},error:null});
 mocks.rpc.mockResolvedValue({data:true,error:null});
 mocks.from.mockImplementation((table:string)=>{
  const result=table==='user_session_revocations'?{data:null,error:null}:table==='admin_users'?{data:{role:'admin',is_primary:false},error:null}:table==='admin_permissions'?{data:{page_access_configured:true,allowed_pages:['gallery']},error:null}:{data:[],error:null};
  const query:any={select:()=>query,eq:()=>query,maybeSingle:()=>Promise.resolve(result),then:(resolve:any)=>Promise.resolve(result).then(resolve)};
  return query;
 });
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('rejects anonymous bulk email and heartbeat before executing their implementations',async()=>{
 for(const name of ['notify-event-update','heartbeat']){
  const sideEffect=vi.fn();const result=await run(secureEvent(name,sideEffect));expect(result.statusCode).toBe(401);expect(sideEffect).not.toHaveBeenCalled();
 }
});
it('does not grant privilege to hardcoded email identities or email aliases',async()=>{
 mocks.from.mockImplementation(()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null,error:null})};return q;});
 const result=await verifyAdmin(token(),{auth:{getUser:mocks.getUser},from:mocks.from});expect(result.isAdmin).toBe(false);expect(result.isOwner).toBe(false);
});
it('denies privilege escalation and checks the assigned management page',async()=>{
 const sideEffect=vi.fn();
 expect((await run(secureEvent('add-admin-user',sideEffect),{}, {authorization:token()})).statusCode).toBe(403);
 expect((await run(secureEvent('send-confirmation',sideEffect),{}, {authorization:token()})).statusCode).toBe(403);
 expect(sideEffect).not.toHaveBeenCalled();
});
it('requires verified native MFA and rejects explicitly revoked sessions',async()=>{
 const client={auth:{getUser:mocks.getUser},from:mocks.from};
 mocks.getUser.mockResolvedValue({data:{user:{id,email:'a@example.test',factors:[{status:'verified'}]}},error:null});
 expect(await verifyToken(token(),client)).toBeNull();
 expect(await verifyToken(`Bearer ${jwt({aal:'aal2'})}`,client)).not.toBeNull();
 mocks.from.mockImplementation(()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{revoked_at:new Date(Date.now()+1000).toISOString()},error:null})};return q;});
 expect(await verifyToken(`Bearer ${jwt({aal:'aal2'})}`,client)).toBeNull();
});
it('ties passkey registration to the authenticated user before any credential work',async()=>{
 expect((await run(register,{userId:id})).statusCode).toBe(401);
 expect((await run(register,{userId:'another-user'}, {authorization:token()})).statusCode).toBe(403);
 expect((await run(challenge,{action:'register',userId:'another-user',email:'victim@example.test'}, {authorization:token()})).statusCode).toBe(403);
 expect(mocks.registration).not.toHaveBeenCalled();
});
it('enforces cross-origin restrictions and request quotas, and fails closed when the limiter fails',async()=>{
 const sideEffect=vi.fn();
 expect((await run(secureEvent('ai-chat',sideEffect),{}, {origin:'https://attacker.example',authorization:token()})).statusCode).toBe(403);
 mocks.rpc.mockResolvedValue({data:false,error:null});
 expect((await run(secureEvent('ai-chat',sideEffect),{}, {authorization:token()})).statusCode).toBe(429);
 mocks.rpc.mockResolvedValue({data:null,error:{message:'private DB details'}});
 expect((await run(secureEvent('ai-chat',sideEffect),{}, {authorization:token()})).statusCode).toBe(503);
 expect(sideEffect).not.toHaveBeenCalled();
});
it('suppresses backend errors and prevents caching of API sessions for either handler format',async()=>{
 const result=await run(secureEvent('health',async()=>({statusCode:500,body:'provider-secret-value'})),{}, {},'GET');
 expect(result.body).not.toContain('provider-secret-value');expect(result.headers['Cache-Control']).toBe('no-store');
 const handler=secureRequest('heartbeat',async()=>Response.json({secret:'session-value'}));
 const denied=await handler(new Request('https://ricorrenza.fun/api/heartbeat',{method:'POST'}));expect(denied.status).toBe(401);expect(denied.headers.get('cache-control')).toBe('no-store');
});
it('blocks private addresses, credentials in URLs, HTTP and arbitrary hosts without fetching',()=>{
 for(const value of ['http://localhost','https://127.0.0.1','https://169.254.169.254/latest/meta-data/','file:///etc/passwd','https://images.unsplash.com@evil.example/x','https://evil.example/x','https://images.unsplash.com:444/x'])expect(()=>allowedMediaUrl(value)).toThrow();
});
it('revalidates redirects and refuses active content and oversized responses',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{location:'https://169.254.169.254/x'}}));vi.stubGlobal('fetch',fetch);
 await expect(fetchImage('https://images.unsplash.com/a')).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
 fetch.mockResolvedValue(new Response('<script>alert(1)</script>',{headers:{'content-type':'text/html'}}));await expect(fetchImage('https://images.unsplash.com/a')).rejects.toThrow();
 fetch.mockResolvedValue(new Response('123456',{headers:{'content-type':'image/png'}}));await expect(fetchImage('https://images.unsplash.com/a',4)).rejects.toThrow(/too large/);
});
it('exports only allowlisted public variables and rejects privileged Supabase keys even with public names',()=>{
 expect(publicEnvironment({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_RANDOM_TOKEN:'secret',VITE_ENCRYPTION_KEY:'secret',VITE_NEW_API_KEY:'secret'})).toEqual({VITE_SUPABASE_URL:'https://example.supabase.co'});
 expect(()=>publicEnvironment({VITE_SUPABASE_ANON_KEY:jwt({role:'service_role'})})).toThrow(/public anonymous/);
 expect(publicEnvironment({VITE_SUPABASE_ANON_KEY:jwt({role:'anon'})})).toHaveProperty('VITE_SUPABASE_ANON_KEY');
});
it('cannot inject HTML attributes or JavaScript links through Instagram embed settings',()=>{
 expect(safeInstagramUrl('https://www.instagram.com/reel/AbC_123/?utm=ok')).toBe('https://www.instagram.com/reel/AbC_123/');
 for(const value of ['javascript:alert(1)','https://evil.example/instagram.com/p/abc','https://www.instagram.com/p/abc/\" onmouseover=\"alert(1)'])expect(safeInstagramUrl(value)).toBeNull();
});
it('does not let a spoofed header for another hosting provider change the limiter identity',()=>{
 vi.stubEnv('VERCEL','1');
 const headers={'x-nf-client-connection-ip':'attacker-value','x-vercel-forwarded-for':'192.0.2.1','x-forwarded-for':'another-attacker-value'};
 expect(trustedClientIp(headers)).toBe('192.0.2.1');
 vi.stubEnv('VERCEL','');vi.stubEnv('NETLIFY','true');
 expect(trustedClientIp(headers)).toBe('attacker-value');
 expect(trustedClientIp({'x-vercel-forwarded-for':'spoofed'})).toBe('unknown');
});
it('rejects legacy master-header access to the account directory and global logout',async()=>{
 vi.stubEnv('MASTER_PASSWORD','legacy-fixture-master');vi.stubEnv('FORCE_LOGOUT_SECRET','legacy-fixture-logout');
 expect((await run(listAdmins,{}, {'x-master-key':'legacy-fixture-master'},'GET')).statusCode).toBe(401);
 expect((await run(forceLogout,{}, {'x-master-key':'legacy-fixture-master','x-force-logout-secret':'legacy-fixture-logout'})).statusCode).toBe(401);
 expect(mocks.getUser).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled();
});
it('does not let a nonowner enumerate admin accounts or force global logout',async()=>{
 expect((await run(listAdmins,{}, {authorization:token()},'GET')).statusCode).toBe(403);
 expect((await run(forceLogout,{}, {authorization:token()})).statusCode).toBe(403);
 expect(mocks.rpc).not.toHaveBeenCalled();
});
it('rejects a revoked coordinator session before contacting the AI provider',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:{id,email:'coordinator@example.test',app_metadata:{role:'coordinator',coordinator_event_id:'event-a'}}},error:null});
 mocks.from.mockImplementation(()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{revoked_at:new Date(Date.now()+1000).toISOString()},error:null})};return q;});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect((await run(coordinatorAI,{eventId:'event-a',mimeType:'image/png',data:'fixture'}, {authorization:token()})).statusCode).toBe(401);
 expect(fetch).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
});
it('restricts manual scheduled email to registration access and accepts only the configured cron secret',async()=>{
 const send=vi.fn().mockResolvedValue(Response.json({success:true}));
 const handler=secureRequest('broadcast-schedule',send);
 const manual=await handler(new Request('https://ricorrenza.fun/api/broadcast-schedule',{method:'POST',headers:{authorization:token()},body:'{}'}));
 expect(manual.status).toBe(403);expect(send).not.toHaveBeenCalled();
 const absent=await handler(new Request('https://ricorrenza.fun/api/broadcast-schedule'));
 expect(absent.status).toBe(401);expect(send).not.toHaveBeenCalled();
 vi.stubEnv('CRON_SECRET','server-fixture-cron');
 const scheduled=await handler(new Request('https://ricorrenza.fun/api/broadcast-schedule',{headers:{authorization:'Bearer server-fixture-cron'}}));
 expect(scheduled.status).toBe(200);expect(send).toHaveBeenCalledTimes(1);
});

it('protects read-only provider checks with participant page access and rejects delivery methods on that route', async () => {
 const implementation = vi.fn(async () => ({ statusCode: 200, body: '{}' })); const route = secureEvent('email-provider-status', implementation);
 expect((await run(route, {}, {}, 'GET')).statusCode).toBe(401); expect((await run(route, {}, { authorization: token() }, 'GET')).statusCode).toBe(403); expect(implementation).not.toHaveBeenCalled();
 expect((await run(route, {}, { authorization: token() }, 'POST')).statusCode).toBe(405);
});

it('scopes cr-batch-iqmg strictly to the caller CR batch and rejects cross-batch or non-CR tokens', async () => {
 expect((await run(crBatchIqmg, {}, {}, 'GET')).statusCode).toBe(401);
 expect((await run(crBatchIqmg, {}, { authorization: token() }, 'POST')).statusCode).toBe(405);
 // Authenticated student or admin without CR role & cr_batch cannot read batch IQMG numbers
 expect((await run(crBatchIqmg, {}, { authorization: token() }, 'GET')).statusCode).toBe(403);

 // CR of batch 2021-2022 cannot query batch 2022-2023 and can only read verified same-batch students
 mocks.getUser.mockResolvedValue({
  data: { user: { id, email: 'cr-2021@staff.ricorrenza.fun', app_metadata: { role: 'cr', cr_batch: '2021-2022' } } },
  error: null,
 });
 const crossBatch = await crBatchIqmg({
  httpMethod: 'GET',
  headers: { authorization: token() },
  queryStringParameters: { batch: '2022-2023' },
 } as any, {} as any, () => {});
 expect(crossBatch?.statusCode).toBe(403);

 mocks.from.mockImplementation((table: string) => {
  const result = table === 'user_session_revocations'
   ? { data: null, error: null }
   : table === 'cr_batches'
     ? { data: { batch: '2021-2022' }, error: null }
     : table === 'profiles'
       ? { data: [{ id: '11111111-1111-4111-8111-111111111111' }], error: null }
       : table === 'student_iqmg_identities'
         ? { data: [{ user_id: '11111111-1111-4111-8111-111111111111', iqmg_number: 'IQMG-2101', status: 'verified' }], error: null }
         : { data: [], error: null };
  const query: any = {
   select: () => query,
   eq: () => query,
   in: () => query,
   order: () => query,
   range: () => Promise.resolve(result),
   maybeSingle: () => Promise.resolve(result),
   then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return query;
 });

 const allowed = await crBatchIqmg({
  httpMethod: 'GET',
  headers: { authorization: token() },
  queryStringParameters: { userIds: '11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222' },
 } as any, {} as any, () => {});
 expect(allowed?.statusCode).toBe(200);
 expect(JSON.parse(allowed!.body!)).toEqual({
  batch: '2021-2022',
  identities: {
   '11111111-1111-4111-8111-111111111111': { iqmg_number: 'IQMG-2101', status: 'verified', note: null, updated_at: null },
  },
 });
});

it('allows a CR to edit or flag correction on own-batch student IQMG while blocking cross-batch, non-CR, and duplicate claims', async () => {
 expect((await run(crManageIqmg, { studentId: '11111111-1111-4111-8111-111111111111', action: 'update', iqmgNumber: 'IQMG-2105' })).statusCode).toBe(401);
 expect((await run(crManageIqmg, {}, { authorization: token() }, 'GET')).statusCode).toBe(405);
 expect((await run(crManageIqmg, { studentId: '11111111-1111-4111-8111-111111111111', action: 'update', iqmgNumber: 'IQMG-2105' }, { authorization: token() })).statusCode).toBe(403);

 mocks.getUser.mockResolvedValue({
  data: { user: { id, email: 'cr-2021@staff.ricorrenza.fun', app_metadata: { role: 'cr', cr_batch: '2021-2022' } } },
  error: null,
 });

 // Reject cross-batch student update even with valid CR session
 mocks.from.mockImplementation((table: string) => {
  const result = table === 'user_session_revocations'
   ? { data: null, error: null }
   : table === 'cr_batches'
     ? { data: { batch: '2021-2022' }, error: null }
     : table === 'profiles'
       ? { data: { id: '22222222-2222-4222-8222-222222222222', batch: '2022-2023' }, error: null }
       : { data: null, error: null };
  const query: any = { select: () => query, eq: () => query, neq: () => query, maybeSingle: () => Promise.resolve(result) };
  return query;
 });
 const crossStudent = await run(crManageIqmg, {
  studentId: '22222222-2222-4222-8222-222222222222',
  action: 'update',
  iqmgNumber: 'IQMG-2299',
 }, { authorization: token() });
 expect(crossStudent.statusCode).toBe(403);

 // Same-batch student update writes student_iqmg_identities and notifies student_inbox
 const insertedInbox: any[] = [];
 mocks.from.mockImplementation((table: string) => {
  const result = table === 'user_session_revocations'
   ? { data: null, error: null }
   : table === 'cr_batches'
     ? { data: { batch: '2021-2022' }, error: null }
     : table === 'profiles'
       ? { data: { id: '11111111-1111-4111-8111-111111111111', batch: '2021-2022' }, error: null }
       : table === 'student_iqmg_identities'
         ? { data: null, error: null }
         : { data: null, error: null };
  const query: any = {
   select: () => query,
   eq: () => query,
   neq: () => query,
   maybeSingle: () => Promise.resolve(result),
   upsert: (row: any) => ({
    select: () => ({
     single: () => Promise.resolve({ data: row, error: null }),
    }),
   }),
   insert: (row: any) => {
    if (table === 'student_inbox') insertedInbox.push(row);
    return Promise.resolve({ data: row, error: null });
   },
  };
  return query;
 });

 const updated = await run(crManageIqmg, {
  studentId: '11111111-1111-4111-8111-111111111111',
  action: 'update',
  iqmgNumber: 'iqmg-2105',
  note: 'Fixed digit typo',
 }, { authorization: token() });
 expect(updated.statusCode).toBe(200);
 expect(JSON.parse(updated.body)).toMatchObject({
  batch: '2021-2022',
  studentId: '11111111-1111-4111-8111-111111111111',
  iqmg_number: 'IQMG-2105',
  status: 'pending',
 });
 expect(insertedInbox[0]).toMatchObject({
  user_id: '11111111-1111-4111-8111-111111111111',
  href: '/dashboard/settings',
 });

 const correction = await run(crManageIqmg, {
  studentId: '11111111-1111-4111-8111-111111111111',
  action: 'correct',
  note: 'Upload ID number not roll number',
 }, { authorization: token() });
 expect(correction.statusCode).toBe(200);
 expect(JSON.parse(correction.body)).toMatchObject({
  iqmg_number: null,
  status: 'correction_required',
 });
});
