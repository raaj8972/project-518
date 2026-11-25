import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {handler,validateIQMGRows} from '../netlify/functions/ai-extract-iqmg-roster';
const mocks=vi.hoisted(()=>({verify:vi.fn(),from:vi.fn(),insert:vi.fn()}));
vi.mock('../netlify/functions/lib/api-security',()=>({secureEvent:(_name:string,implementation:unknown)=>implementation}));
vi.mock('../netlify/functions/lib/auth-verify',()=>({verifyAdmin:mocks.verify}));
vi.mock('../netlify/functions/lib/supabase',()=>({getSupabaseClient:()=>({from:mocks.from})}));
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('GOOGLE_API_KEY','fixture-only');mocks.verify.mockResolvedValue({isAdmin:true,user:{id:'admin'}});mocks.from.mockReturnValue({insert:mocks.insert});mocks.insert.mockReturnValue({select:()=>({single:async()=>({data:{id:'draft'},error:null})})});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
const request=(body:any)=>handler({httpMethod:'POST',headers:{authorization:'Bearer fixture'},body:JSON.stringify(body)} as any,{} as any,()=>{});
it('rejects anonymous access and non-PDF uploads before any AI request',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);mocks.verify.mockResolvedValue({isAdmin:false,user:null});expect((await request({}))?.statusCode).toBe(403);expect(fetch).not.toHaveBeenCalled();mocks.verify.mockResolvedValue({isAdmin:true,user:{id:'admin'}});expect((await request({mimeType:'text/plain',data:'text'}))?.statusCode).toBe(400);expect(fetch).not.toHaveBeenCalled();});
it('preserves leading zeroes, saves a private extraction draft and never verifies an identity from AI output',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({rows:[{iqmg_number:'001122',full_name:'Student A',batch:'2024'}]})}]}}]})});vi.stubGlobal('fetch',fetch);
 const response:any=await request({mimeType:'application/pdf',fileName:'college.pdf',data:Buffer.from('%PDF-1.4\nsynthetic fixture').toString('base64')});expect(response.statusCode).toBe(200);expect(JSON.parse(response.body)).toEqual({import_id:'draft',rows_count:1});expect(mocks.from).toHaveBeenCalledWith('iqmg_roster_imports');expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({rows:[{iqmg_number:'001122',full_name:'Student A',batch:'2024'}],created_by:'admin'}));expect(fetch.mock.calls[0][1].body).toContain('untrusted DATA');
});
it('does not turn malformed, truncated or guessed numeric IDs into verified records',async()=>{
 expect(()=>validateIQMGRows({rows:[{iqmg_number:1122,full_name:'Student A'}]})).toThrow();expect(validateIQMGRows({rows:[{iqmg_number:'1122',full_name:'Student A'},{iqmg_number:'1122',full_name:'Student A'}]})).toHaveLength(1);
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'incomplete'}]}}]})}));expect((await request({mimeType:'application/pdf',data:Buffer.from('%PDF-1.4 fixture').toString('base64')}))?.statusCode).toBe(422);expect(mocks.insert).not.toHaveBeenCalled();
});
it('reports Gemini access configuration errors without saving or verifying any roster row',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:403}));const response:any=await request({mimeType:'application/pdf',data:Buffer.from('%PDF-1.4 fixture').toString('base64')});expect(response.statusCode).toBe(503);expect(JSON.parse(response.body).error).toContain('GEMINI_API_KEY');expect(mocks.insert).not.toHaveBeenCalled();});
