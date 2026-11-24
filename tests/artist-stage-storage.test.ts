import {afterEach, expect, it, vi} from 'vitest';
const mocks=vi.hoisted(()=>({send:vi.fn(),galleryError:false,clipError:false,desktopError:false}));
vi.mock('@aws-sdk/client-s3',()=>({
 S3Client:class{send=mocks.send;},
 ListObjectsV2Command:class{constructor(public input:unknown){}},
 DeleteObjectsCommand:class{constructor(public input:unknown){}},
}));
vi.mock('@netlify/functions',()=>({schedule:(_:string,handler:unknown)=>handler}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({from:(table:string)=>({select:async(column:string)=>{
 if(table==='guest_artists'&&column==='desktop_gallery_images')return mocks.desktopError?{data:null,error:new Error('offline')}:{data:[{desktop_gallery_images:['https://media.example/artist/desktop-photo.webp']}],error:null};
 if(table==='guest_artists'&&column==='desktop_stage_clip_urls')return {data:[{desktop_stage_clip_urls:['https://media.example/artist/desktop-clip.mp4']}],error:null};
 if(table==='guest_artists'&&column==='stage_clip_urls')return mocks.clipError?{data:null,error:new Error('offline')}:{data:[{stage_clip_urls:['https://media.example/artist/clip-one.mp4','https://media.example/artist/clip-two.mp4']}],error:null};
 if(table==='guest_artists'&&column==='gallery_images')return mocks.galleryError?{data:null,error:new Error('offline')}:{data:[{gallery_images:['https://media.example/artist/gallery-one.webp','https://media.example/artist/gallery-two.webp']}],error:null};
 return {data:[],error:null};
}})})}));
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();mocks.send.mockReset();mocks.galleryError=false;mocks.clipError=false;mocks.desktopError=false;vi.resetModules();});
async function collector(){vi.stubEnv('R2_BUCKET_NAME','test-media');vi.stubEnv('R2_PUBLIC_DOMAIN','media.example');return (await import('../netlify/functions/r2-garbage-collector')).scheduledHandler;}
it('keeps all uploaded artist gallery photos when checking storage for orphaned media',async()=>{
 const handler=await collector();
 mocks.send.mockResolvedValueOnce({Contents:[{Key:'artist/gallery-one.webp',LastModified:new Date(0)},{Key:'artist/gallery-two.webp',LastModified:new Date(0)},{Key:'artist/clip-one.mp4',LastModified:new Date(0)},{Key:'artist/clip-two.mp4',LastModified:new Date(0)},{Key:'artist/desktop-photo.webp',LastModified:new Date(0)},{Key:'artist/desktop-clip.mp4',LastModified:new Date(0)},{Key:'orphan.webp',LastModified:new Date(0)}]}).mockResolvedValueOnce({});
 const result=await handler({} as any,{} as any,vi.fn());
 expect(JSON.parse((result as any).body)).toMatchObject({deletedCount:1,orphanedKeys:['orphan.webp']});
 expect(mocks.send.mock.calls[1][0].input.Delete.Objects).toEqual([{Key:'orphan.webp'}]);
});
it('skips cleanup if artist gallery references cannot be read',async()=>{
 const handler=await collector();mocks.galleryError=true;vi.spyOn(console,'error').mockImplementation(()=>{});
 const result=await handler({} as any,{} as any,vi.fn());expect((result as any).statusCode).toBe(500);expect(mocks.send).not.toHaveBeenCalled();
});

it('keeps stored media if short clip references cannot be verified',async()=>{
 const handler=await collector();mocks.clipError=true;vi.spyOn(console,'error').mockImplementation(()=>{});const result=await handler({} as any,{} as any,vi.fn());expect((result as any).statusCode).toBe(500);expect(mocks.send).not.toHaveBeenCalled();
});

it('skips media deletion if desktop media references cannot be checked',async()=>{
 const handler=await collector();mocks.desktopError=true;vi.spyOn(console,'error').mockImplementation(()=>{});const result=await handler({} as any,{} as any,vi.fn());expect((result as any).statusCode).toBe(500);expect(mocks.send).not.toHaveBeenCalled();
});
