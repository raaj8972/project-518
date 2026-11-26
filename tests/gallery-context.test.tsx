// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), invalid: vi.fn(), changes: {} as Record<string, (value: any) => void> }));
vi.mock('../src/context/CoreDataContext', () => ({ useCoreData: () => ({ refreshTrigger: 0 }) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ getValidToken: async () => 'fixture' }) }));
vi.mock('../src/utils/dataUtils', () => ({ DEFAULT_GALLERY_SETTINGS: { id: 1 } }));
vi.mock('../src/lib/dualDb', () => ({ dualRead: mocks.read, dualInsert: mocks.insert, dualUpdate: mocks.update, dualDelete: mocks.remove, dualUpsert: vi.fn(), invalidateTableCache: mocks.invalid }));
vi.mock('../src/lib/supabase', () => ({ supabase: { channel: () => { const query: any = { on: (_name: string, filter: any, callback: any) => { mocks.changes[filter.table] = callback; return query; }, subscribe: () => query }; return query; }, removeChannel: vi.fn() } }));
import { GalleryProvider, useGalleryData } from '../src/context/GalleryContext';
it('loads past 1,000 photos in unique order, retains a complete library on failure and applies live photo updates without refetching it', async () => {
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
 const photos = Array.from({ length: 1004 }, (_, index) => ({ id: 1004 - index, src: `drive://photo-test-${index}`, title: 'Photo', category: 'Cultural', year: '2026' }));
 mocks.read.mockImplementation(async (options: any) => options.table === 'gallery_settings' ? { data: { id: 1 } } : options.count ? { data: [{ id: 1 }], count: 1004 } : { data: photos.slice(options.range[0], options.range[1] + 1) });
 let api: ReturnType<typeof useGalleryData>;
 function Probe() { api = useGalleryData(); return <p>{api.galleryImages.length}</p>; }
 const host = document.createElement('div'), root = createRoot(host);
 await act(async () => root.render(<GalleryProvider><Probe /></GalleryProvider>)); await act(async () => api!.loadGalleryImages());
 expect(api!.galleryImages).toHaveLength(1004); expect(new Set(api!.galleryImages.map(image => image.id)).size).toBe(1004); expect(mocks.read.mock.calls.filter(([options]) => options.range).every(([options]) => options.order[0] === 'id')).toBe(true);
 mocks.read.mockClear(); await act(async () => mocks.changes.gallery_images({ eventType: 'UPDATE', new: { ...photos[0], title: 'Updated photo' } })); expect(api!.galleryImages[0].title).toBe('Updated photo'); expect(mocks.read).not.toHaveBeenCalled();
 mocks.read.mockRejectedValueOnce(new Error('offline')); await act(async () => api!.loadGalleryImages(true)); expect(api!.galleryError).toContain('offline'); expect(api!.galleryImages).toHaveLength(1004);
 await act(async () => root.unmount());
});
