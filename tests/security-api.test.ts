import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { secureEvent, secureRequest } from '../netlify/functions/lib/api-security';
import { verifyAdmin, verifyToken } from '../netlify/functions/lib/auth-verify';
import { handler as register } from '../netlify/functions/passkey-register';
import { handler as challenge } from '../netlify/functions/passkey-challenge';
import { handler as listAdmins } from '../netlify/functions/list-admin-users';
import { handler as forceLogout } from '../netlify/functions/force-logout';
import { handler as coordinatorAI } from '../netlify/functions/coordinator-ai-groups';
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
it('rejects anonymous bulk email, heartbeat and face indexing before executing their implementations',async()=>{
 for(const name of ['notify-event-update','heartbeat','index-faces-batch']){
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
