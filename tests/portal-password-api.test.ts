import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {handler} from '../netlify/functions/portal-passwords';
import {sealPortalPassword,openPortalPassword} from '../netlify/functions/lib/portal-password-vault';
const mocks=vi.hoisted(()=>({verify:vi.fn(),rpc:vi.fn(),from:vi.fn(),hash:'hash',copy:null as any}));
vi.mock('../netlify/functions/lib/auth-verify',()=>({verifyAdmin:mocks.verify}));
vi.mock('../netlify/functions/lib/supabase',()=>({getSupabaseClient:()=>({from:mocks.from,rpc:mocks.rpc})}));
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('PORTAL_PASSWORD_VAULT_KEY','fixture-key');mocks.hash='hash';mocks.copy=null;
 mocks.verify.mockResolvedValue({user:{id:'owner-id'},isOwner:true});mocks.rpc.mockResolvedValue({data:'1',error:null});
 mocks.from.mockImplementation(table=>{const builder:any={select:()=>builder,eq:()=>builder,maybeSingle:async()=>({data:table==='portal_password_current'?{password_hash:mocks.hash}:mocks.copy,error:null})};return builder;});
});
afterEach(()=>vi.unstubAllEnvs());
const run=async(body:object)=>await handler({httpMethod:'POST',headers:{authorization:'Bearer fixture'},body:JSON.stringify(body)}as any,{}as any,()=>{})as any;
it('denies nonowners before reading any password',async()=>{
 mocks.verify.mockResolvedValue({user:{id:'admin-id'},isOwner:false});expect((await run({action:'reveal',portal:'council'})).statusCode).toBe(403);expect(mocks.from).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each([['council','1'],['cr','2026'],['security','guard']])('reveals only current encrypted %s credentials',async(portal,id)=>{
 mocks.copy={password_hash:'hash',ciphertext:sealPortalPassword(`${portal}:${id}`,'portal-secret')};
 const response=await run({action:'reveal',portal,id});expect(JSON.parse(response.body)).toEqual({password:'portal-secret'});expect(response.headers['Cache-Control']).toContain('no-store');
 mocks.hash='rotated';expect((await run({action:'reveal',portal,id})).statusCode).toBe(409);
});
it('reports missing legacy copies without inventing passwords',async()=>{const response=await run({action:'reveal',portal:'cr',id:'2026'});expect(response.statusCode).toBe(409);expect(JSON.parse(response.body).password).toBeUndefined();});
it('encrypts saves and binds the copy to the portal and account',async()=>{
 expect((await run({action:'save',portal:'security',id:'guard',password:'short'})).statusCode).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();
 expect((await run({action:'save',portal:'security',id:'guard',password:'new-secret',create:true,fullName:'Guard'})).statusCode).toBe(200);
 const [name,args]=mocks.rpc.mock.calls[0];expect(name).toBe('save_portal_password_copy');expect(args.p_actor).toBe('owner-id');expect(args.p_create).toBe(true);expect(args.p_ciphertext).not.toContain('new-secret');expect(openPortalPassword('security:guard',args.p_ciphertext)).toBe('new-secret');expect(()=>openPortalPassword('cr:guard',args.p_ciphertext)).toThrow();
});

it('accepts numeric PINs without needing an email',async()=>{expect((await run({action:'save',portal:'council',password:'4826'})).statusCode).toBe(200);expect(mocks.rpc.mock.calls[0][1].p_password).toBe('4826');});
