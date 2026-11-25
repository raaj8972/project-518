import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({sign:vi.fn(),authChange:undefined as undefined|((event:string)=>void)}));
vi.mock('../src/lib/supabase',()=>({supabase:{auth:{onAuthStateChange:(callback:any)=>{mocks.authChange=callback;}},storage:{from:()=>({createSignedUrl:mocks.sign})}}}));
let media:typeof import('../src/services/privateMedia');
beforeEach(async()=>{vi.resetModules();vi.stubEnv('VITE_SUPABASE_URL','https://fixture.supabase.co');mocks.sign.mockReset().mockResolvedValue({data:{signedUrl:'https://fixture.supabase.co/signed?token=fixture'},error:null});media=await import('../src/services/privateMedia');});
afterEach(()=>vi.unstubAllEnvs());
it('signs a private legacy reference with a short expiry and preserves its stable stored path',async()=>{
 const original='https://fixture.supabase.co/storage/v1/object/public/registration-photos/student%2Fphoto.jpg';
 expect(await media.resolvePrivateMediaUrl(original)).toContain('/signed?');expect(mocks.sign).toHaveBeenCalledWith('student/photo.jpg',600);
});
it('does not send external paths or public event images for signing',async()=>{
 for(const url of ['https://foreign.test/storage/v1/object/public/registration-photos/photo.jpg','https://fixture.supabase.co/storage/v1/object/public/event-images/poster.jpg'])expect(await media.resolvePrivateMediaUrl(url)).toBe(url);
 expect(mocks.sign).not.toHaveBeenCalled();
});
it('does not reuse a previous account signed-URL cache after a session change',async()=>{
 const original='https://fixture.supabase.co/storage/v1/object/public/registration-photos/photo.jpg';await media.resolvePrivateMediaUrl(original);await media.resolvePrivateMediaUrl(original);expect(mocks.sign).toHaveBeenCalledTimes(1);
 mocks.authChange?.('SIGNED_OUT');mocks.sign.mockResolvedValue({data:null,error:{message:'Access denied'}});await expect(media.resolvePrivateMediaUrl(original)).rejects.toThrow(/access/);expect(mocks.sign).toHaveBeenCalledTimes(2);
});
