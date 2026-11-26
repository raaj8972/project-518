// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { GalleryManagement } from '../src/components/admin/GalleryManagement';
const mocks = vi.hoisted(() => ({ data: {} as any, add: vi.fn(), update: vi.fn(), remove: vi.fn(), bulk: vi.fn(), load: vi.fn(), approval: vi.fn(), requires: vi.fn(), uploadBusy: null as null | ((value: boolean) => void) }));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/hooks/useApprovals', () => ({ useApprovals: () => ({ submitForApproval: mocks.approval, checkRequiresApproval: mocks.requires }) }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: ({ onImageSelect, onProcessingChange, preserveExistingMedia }: any) => { mocks.uploadBusy = onProcessingChange; return <button type="button" data-preserve={preserveExistingMedia} onClick={() => onImageSelect('https://images.example/photo.webp')}>Upload fixture</button>; } }));
let root: Root, host: HTMLDivElement;
const photo = (id: number, album = 'Stage night') => ({ id, src: `drive://public-photo-${id}`, title: `Stage photo ${id}`, category: 'Cultural', subcategory: album, year: id === 3 ? '2025' : '2026', featured: id === 2, face_index_status: 'pending' });
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); mocks.requires.mockResolvedValue(false); mocks.load.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined); mocks.add.mockResolvedValue(undefined); mocks.bulk.mockResolvedValue(undefined); mocks.approval.mockResolvedValue({ success: true }); mocks.data = { galleryImages: [photo(1), photo(2), photo(3, 'Opening')], eventCategories: [{ name: 'Cultural' }], homepageSettings: { brand_year: 2026 }, galleryLoading: false, loadGalleryImages: mocks.load, addGalleryImage: mocks.add, updateGalleryImage: mocks.update, deleteGalleryImage: mocks.remove, bulkDeleteGalleryImages: mocks.bulk, updateGallerySettings: vi.fn() }; host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const render = async () => { await act(async () => root.render(<GalleryManagement />)); };
const dialog = () => document.querySelector<HTMLElement>('[role=dialog]')!;
const btn = (name: string, scope: ParentNode = document) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === name || button.textContent?.trim() === name || button.textContent?.trim().startsWith(name))!;
const click = async (name: string, scope?: ParentNode) => { await act(async () => btn(name, scope).click()); };
async function change(label: string, value: string, scope: ParentNode = dialog()) { const field = [...scope.querySelectorAll('label')].find(row => row.querySelector('span')?.textContent === label)!.querySelector<HTMLInputElement>('input,select')!; await act(async () => { Object.getOwnPropertyDescriptor(field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }
async function submit() { await act(async () => document.getElementById('gallery-photo-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
it('starts with real album covers, opens only that album and searches across the library', async () => {
 await render(); expect(host.textContent).not.toMatch(/Face search|Scan this photo|Not scanned/); expect(host.querySelectorAll('.gallery-album')).toHaveLength(2); await click('2026THE MOMENTS WE COME BACK TOStage night'); expect(host.querySelectorAll('.gallery-library-photo')).toHaveLength(2);
 await click('All albums'); await change('Search photo library', 'Opening', host); expect(host.querySelectorAll('.gallery-album')).toHaveLength(1);
});
it('retains failed edits in the side inspector, saves metadata on retry and locks dismissal during uploads', async () => {
 await render(); await click('Photos'); await click('Open Stage photo 2'); await change('Photo title *', 'A festival moment'); mocks.update.mockRejectedValueOnce(new Error('Connection interrupted'));
 await submit(); expect(dialog().querySelector('[role=alert]')?.textContent).toContain('Connection interrupted'); await submit(); expect(mocks.update).toHaveBeenLastCalledWith(2, expect.objectContaining({ title: 'A festival moment', src: 'drive://public-photo-2' })); expect(dialog()).toBeNull();
 await click('Add photo'); await act(async () => mocks.uploadBusy!(true)); expect(btn('Uploading…', dialog()).disabled).toBe(true); expect(btn('Close photo panel', dialog()).disabled).toBe(true);
});
it('sends restricted edits for approval and removes only explicitly selected photo links', async () => {
 await render(); await click('Photos'); await click('Select photos'); await click('Select Stage photo 2'); await click('Remove', host); expect(mocks.bulk).not.toHaveBeenCalled(); expect(dialog().textContent).toContain('original Drive or uploaded files are kept'); await click('Cancel', dialog());
 await click('Done selecting'); await click('Open Stage photo 1'); mocks.requires.mockResolvedValue(true); await change('Album name', 'New album'); await submit(); expect(mocks.approval).toHaveBeenCalledWith('gallery_image', 'update', expect.objectContaining({ subcategory: 'New album' }), 1); expect(mocks.update).not.toHaveBeenCalled();
});
it('bounds photo rendering with pages and accurately shows errors instead of an empty collection', async () => {
 mocks.data.galleryImages = Array.from({ length: 85 }, (_, index) => photo(index + 1)); await render(); await click('Photos'); expect(host.querySelectorAll('.gallery-library-photo')).toHaveLength(40); await click('Next photo page'); expect(host.querySelectorAll('.gallery-library-photo')).toHaveLength(40); await click('Next photo page'); expect(host.querySelectorAll('.gallery-library-photo')).toHaveLength(5);
 mocks.data.galleryError = 'Some photos could not load.'; await render(); expect(host.querySelector('[role=alert]')?.textContent).toContain('Some photos'); await click('Retry loading'); expect(mocks.load).toHaveBeenCalledWith(true);
});
