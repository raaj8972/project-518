import {beforeEach,expect,it,vi} from 'vitest';
import {handler} from '../netlify/functions/security-login';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),generate:vi.fn(),update:vi.fn()}));
vi.mock('../netlify/functions/lib/supabase',()=>({getSupabaseClient:()=>({rpc:mocks.rpc,auth:{admin:{generateLink:mocks.generate,updateUserById:mocks.update}}})}));
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValueOnce({data:{allowed:true},error:null}).mockResolvedValueOnce({data:{success:true,user:{id:1,username:'staff-internal',full_name:'Ravi Guard'}},error:null});mocks.generate.mockResolvedValue({data:{user:{id:'guard-id',app_metadata:{}},properties:{hashed_token:'once'}},error:null});mocks.update.mockResolvedValue({error:null});});
it('signs in by name and PIN, issuing a session for the canonical staff identity',async()=>{
 const response=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({username:'Ravi Guard',password:'4826'})}as any,{}as any,()=>{})as any;
 expect(response.statusCode).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('authenticate_security_user',{p_username:'Ravi Guard',p_password:'4826'});
 expect(mocks.update).toHaveBeenCalledWith('guard-id',{app_metadata:{role:'security',security_username:'staff-internal'}});expect(JSON.parse(response.body).token_hash).toBe('once');expect(response.body).not.toContain('4826');
});
it('confirms new security accounts and regenerates a magiclink token when generateLink returns signup',async()=>{
 mocks.rpc.mockReset();
 mocks.rpc.mockResolvedValueOnce({data:{allowed:true},error:null}).mockResolvedValueOnce({data:{success:true,user:{id:1,username:'staff-internal',full_name:'Ravi Guard'}},error:null});
 mocks.generate.mockReset();
 mocks.generate
  .mockResolvedValueOnce({data:{user:{id:'guard-new',app_metadata:{}},properties:{hashed_token:'signup-once',verification_type:'signup'}},error:null})
  .mockResolvedValueOnce({data:{user:{id:'guard-new',app_metadata:{role:'security',security_username:'staff-internal'}},properties:{hashed_token:'magic-once',verification_type:'magiclink'}},error:null});
 const response=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({username:'Ravi Guard',password:'4826'})}as any,{}as any,()=>{})as any;
 expect(response.statusCode).toBe(200);
 expect(mocks.update).toHaveBeenNthCalledWith(2,'guard-new',{email_confirm:true});
 expect(JSON.parse(response.body)).toMatchObject({token_hash:'magic-once',type:'magiclink'});
});
