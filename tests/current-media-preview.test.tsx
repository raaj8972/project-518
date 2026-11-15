// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ImageUpload } from '../src/components/ImageUpload';
const mocks=vi.hoisted(()=>({selected:vi.fn(),pending:vi.fn()}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({sanitizeUrl:(value:string)=>value,isAdmin:()=>false})}));
vi.mock('../src/lib/supabase',()=>({supabase:{auth:{getUser:async()=>({data:{user:null}})}}}));
vi.mock('../src/utils/videoOptimizer',()=>({optimizeVideo:vi.fn()}));
vi.mock('../src/utils/imageOptimizer',()=>({optimizeImage:vi.fn()}));
vi.mock('../src/utils/storageUtils',()=>({deleteStorageFileByPublicUrl:vi.fn()}));
vi.mock('../src/hooks/useMediaUpload',()=>({useMediaUpload:()=>({isProcessing:false,setIsProcessing:vi.fn(),uploading:false,uploadPercent:0,pendingImage:'',setPendingImage:mocks.pending,error:'',setError:vi.fn(),handleUploadProcess:vi.fn()})}));
it('renders the actual current fallback video with replacement controls without treating it as an upload',async()=>{
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const render=(currentImage='')=><ImageUpload bucket="hero_v2" acceptedTypes="video/mp4" currentImage={currentImage} previewFallback="/hero-preview.mp4" onImageSelect={mocks.selected} preserveExistingMedia />;
  try{
    await act(async()=>root.render(render()));
    expect(host.querySelector('video')?.getAttribute('src')).toBe('/hero-preview.mp4');expect(host.querySelector('video')?.controls).toBe(true);
    expect(host.textContent).toContain('Current website media');expect(mocks.selected).not.toHaveBeenCalled();
    const remove=host.querySelector<HTMLButtonElement>('button[title="Delete"]')!;expect(remove.disabled).toBe(true);
    const input=host.querySelector('input[type="file"]') as HTMLInputElement;const click=vi.spyOn(input,'click').mockImplementation(()=>{});
    await act(async()=>host.querySelector<HTMLButtonElement>('button[title="Change"]')!.click());expect(click).toHaveBeenCalledTimes(1);
    await act(async()=>root.render(render('https://media.example/saved.mp4')));
    expect(host.querySelector('video')?.getAttribute('src')).toBe('https://media.example/saved.mp4');expect(remove.disabled).toBe(false);
    await act(async()=>root.render(render()));expect(host.querySelector('video')?.getAttribute('src')).toBe('/hero-preview.mp4');
  }finally{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();}
});
it('keeps file confirmation inside its native parent dialog so it stays interactive',async()=>{
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(<dialog open><ImageUpload bucket="hero_v2" acceptedTypes="video/mp4" currentImage="saved.mp4" onImageSelect={mocks.selected} preserveExistingMedia /></dialog>));
    await act(async()=>host.querySelector<HTMLButtonElement>('button[title="Delete"]')!.click());
    expect(host.querySelector('dialog')?.textContent).toContain('Remove from draft?');
    const cancel=[...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(button=>button.textContent==='Cancel')!;await act(async()=>cancel.click());
    expect(host.querySelector('dialog')?.textContent).not.toContain('Remove from draft?');
  }finally{await act(async()=>root.unmount());host.remove();}
});
