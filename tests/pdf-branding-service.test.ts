// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { loadPdfBranding, uploadPdfBrandAsset, removePdfBrandAsset } from '../src/services/pdfBranding';
const mocks = vi.hoisted(() => ({ list: vi.fn(), sign: vi.fn(), upload: vi.fn(), remove: vi.fn(), prepare: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { storage: { from: () => ({ list: mocks.list, createSignedUrl: mocks.sign, upload: mocks.upload, remove: mocks.remove }) } } }));
vi.mock('../src/utils/brandAsset', () => ({ prepareBrandAsset: mocks.prepare }));
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue({ data: [{ name: 'watermark.svg' }, { name: 'watermark.png' }, { name: 'stamp.png' }] }); mocks.sign.mockImplementation(async (name: string) => ({ data: { signedUrl: `https://assets.example/${name}?token=fixture` } })); mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null }); mocks.prepare.mockImplementation(async (file: File) => file); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['fixture-png'], { type: 'image/png' }) })); });
afterEach(() => vi.unstubAllGlobals());
it('loads branding through authorized URLs, prefers PNG and preloads both images for reports', async () => {
 const result = await loadPdfBranding(); expect(mocks.sign).toHaveBeenCalledWith('watermark.png', 3600); expect(result.watermark?.dataUrl).toMatch(/^data:image\/png;base64,/); expect(result.stamp?.dataUrl).toMatch(/^data:image\/png;base64,/); expect(mocks.list).toHaveBeenCalledOnce();
});
it('never deletes the existing asset before replacement, and propagates upload and removal failures', async () => {
 mocks.upload.mockResolvedValueOnce({ error: { message: 'Storage denied' } }); await expect(uploadPdfBrandAsset('stamp', new File(['fixture'], 'stamp.png', { type: 'image/png' }))).rejects.toThrow('Storage denied'); expect(mocks.remove).not.toHaveBeenCalled();
 mocks.remove.mockResolvedValueOnce({ error: { message: 'Removal denied' } }); await expect(removePdfBrandAsset('watermark')).rejects.toThrow('Removal denied');
});
it('does not turn missing permissions or failed downloads into empty branding', async () => {
 mocks.list.mockResolvedValueOnce({ error: { message: 'Access denied' } }); await expect(loadPdfBranding()).rejects.toThrow('could not load');
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); await expect(loadPdfBranding()).rejects.toThrow('could not be downloaded');
});
