// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AdminModal } from '../src/components/admin/layout/AdminModal';
import { ImageUpload } from '../src/components/ImageUpload';
import { drawImageCrop } from '../src/utils/imageCrop';
const mocks = vi.hoisted(() => ({ upload:vi.fn(), selected:vi.fn(), draw:vi.fn(), aspect:0 }));
vi.mock('../src/context/DataContext',()=>({useData:()=>({isAdmin:()=>true,adminUsers:[],sanitizeUrl:(url:string)=>url})}));
vi.mock('../src/lib/supabase',()=>({supabase:{auth:{getUser:async()=>({data:{user:null}})}}}));
vi.mock('../src/utils/storageUtils',()=>({deleteStorageFileByPublicUrl:vi.fn()}));
vi.mock('../src/hooks/useMediaUpload',()=>({useMediaUpload:()=>({isProcessing:false,setIsProcessing:vi.fn(),uploading:false,pendingImage:'',setPendingImage:vi.fn(),error:'',setError:vi.fn(),handleUploadProcess:mocks.upload})}));
vi.mock('react-easy-crop',()=>({default:(props:any)=>{mocks.aspect=props.aspect;return <button type="button" onClick={()=>props.onCropAreaChange({}, {x:150,y:50,width:250,height:300})}>Move selected crop</button>;}}));
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.upload.mockResolvedValue('https://files.example/cropped.jpg');
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,blob:async()=>new Blob(['photo'],{type:'image/jpeg'})})));
  vi.stubGlobal('Image',class {naturalWidth=800;naturalHeight=600;width=800;height=600;crossOrigin='';onload:any;onerror:any;set src(_url:string){queueMicrotask(()=>this.onload?.());}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({translate:vi.fn(),rotate:vi.fn(),drawImage:mocks.draw,imageSmoothingEnabled:true,imageSmoothingQuality:'high'}) as any);
  vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['cropped'],{type:'image/jpeg'})));
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function click(text:string){const button=[...document.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===text)!;expect(button,text).toBeTruthy();await act(async()=>button.click());}
it('shows the exact council frame live, locks its ratio and saves the selected crop',async()=>{
  await act(async()=>root.render(<ImageUpload bucket="team-images" currentImage="saved.jpg" profileCrop="council" onImageSelect={mocks.selected} preserveExistingMedia/>));
  await click('Adjust photo crop');await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
  expect(document.querySelector('[aria-label="Live website crop preview"]')).not.toBeNull();expect(mocks.aspect).toBeCloseTo(5/6);
  expect(document.body.textContent).not.toContain('Use Original');expect(document.body.textContent).not.toContain('Template Settings');
  await click('Move selected crop');await click('Save & Apply');
  expect(mocks.upload).toHaveBeenCalledTimes(1);expect(mocks.selected).toHaveBeenCalledWith('https://files.example/cropped.jpg');
  expect(mocks.draw.mock.calls.some(args=>args[1]===150&&args[2]===50&&args[3]===250&&args[4]===300)).toBe(true);
});
it('uses the same crop geometry for preview and export, with bounded output resolution',()=>{
  const image={naturalWidth:800,naturalHeight:600} as HTMLImageElement,crop={x:150,y:50,width:250,height:300};
  const preview=drawImageCrop(image,crop,90,150),saved=drawImageCrop(image,crop,90,1200);
  expect([preview.width,preview.height]).toEqual([125,150]);expect([saved.width,saved.height]).toEqual([250,300]);
  expect(()=>drawImageCrop(image,{...crop,width:0},0)).toThrow('Select an image crop');
});

it('previews the faculty crop at 4:5 and closes only the nested crop on Escape',async()=>{
 const close=vi.fn();
 await act(async()=>root.render(<AdminModal appearance="people" isOpen title="Edit faculty" onClose={close}><ImageUpload bucket="faculty-images" currentImage="faculty.jpg" profileCrop="faculty" onImageSelect={mocks.selected}/></AdminModal>));
 await click('Adjust photo crop');await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});expect(mocks.aspect).toBeCloseTo(4/5);expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2);expect(document.querySelector('.profile-crop-preview')?.textContent).not.toContain('HEAD');
 await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(close).not.toHaveBeenCalled();expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);expect(document.body.style.overflow).toBe('hidden');
});
