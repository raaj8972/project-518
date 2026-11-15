// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useMediaUpload } from '../src/hooks/useMediaUpload';
const mocks = vi.hoisted(() => ({ remove: vi.fn(), selected: vi.fn(), upload: vi.fn(), url: vi.fn() }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ start() {}, set() {}, done() {} }) }));
vi.mock('../src/utils/uploadUtils', () => ({ mapUploadError: () => ({ message: 'Upload failed' }) }));
vi.mock('../src/utils/storageUtils', () => ({ deleteStorageFileByPublicUrl: mocks.remove }));
vi.mock('../src/lib/supabase', () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, getPublicUrl: mocks.url }) } } }));
let root: Root, container: HTMLDivElement;
let media: ReturnType<typeof useMediaUpload>;
function Harness({ preserve = true }: { preserve?: boolean }) { media = useMediaUpload({ bucket: 'hero-media', onImageSelect: mocks.selected, preserveExistingMedia: preserve }); return null; }
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); mocks.upload.mockResolvedValue({ error: null }); mocks.url.mockReturnValueOnce({ data: { publicUrl: 'draft-one.png' } }).mockReturnValueOnce({ data: { publicUrl: 'draft-two.png' } }); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it('keeps published and earlier draft assets intact when a logo is replaced in the studio', async () => {
  await act(async () => root.render(<Harness />));
  const file = new File(['logo'], 'logo.png', { type: 'image/png' });
  await act(async () => { await media.handleUploadProcess(file, true, false, 'published.png'); });
  await act(async () => { await media.handleUploadProcess(file, true, false, 'published.png'); });
  expect(mocks.selected).toHaveBeenLastCalledWith('draft-two.png'); expect(mocks.remove).not.toHaveBeenCalled();
});
it('preserves the existing replacement behavior for uploaders outside the studio', async () => {
  await act(async () => root.render(<Harness preserve={false} />));
  await act(async () => { await media.handleUploadProcess(new File(['logo'], 'logo.png'), true, false, 'published.png'); });
  expect(mocks.remove).toHaveBeenCalledWith('published.png'); expect(mocks.selected).toHaveBeenCalledWith('draft-one.png');
});
it('reports a missing/null public URL as an upload error instead of dereferencing a null object',async()=>{
 const logged=vi.spyOn(console,'error').mockImplementation(()=>{});mocks.url.mockReset().mockReturnValue({data:null});await act(async()=>root.render(<Harness/>));
 await act(async()=>{await expect(media.handleUploadProcess(new File(['test'],'fixture.png',{type:'image/png'}),true)).rejects.toThrow('no media URL');});expect(mocks.selected).not.toHaveBeenCalled();expect(media.error).toBe('Upload failed');logged.mockRestore();
});
