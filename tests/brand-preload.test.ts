// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: database }));
const key = 'rico_brand_logo_url';
const links = () => [...document.querySelectorAll<HTMLLinkElement>('link[rel="preload"]')];
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); localStorage.clear(); document.head.querySelectorAll('link[rel="preload"]').forEach(link => link.remove()); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('warms the cached logo without querying settings, fetching other assets or scheduling duplicate reads', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); vi.useFakeTimers();
  localStorage.setItem(key, 'https://cdn.example/crest.webp?v=published');
  const module = await import('../src/utils/preloadBrand');
  module.preloadLogoFromCache();
  expect(links().map(link => link.href)).toEqual(['https://cdn.example/crest.webp?v=published']);
  await vi.advanceTimersByTimeAsync(1000);
  expect(database.from).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it('reuses the published versioned logo while leaving hero and sponsor loading to their components', async () => {
  const { preloadBrandAssets } = await import('../src/utils/preloadBrand');
  const settings = { brand_logo_url: 'https://cdn.example/crest.png?size=400', updated_at: 'new upload', hero_media_url: 'https://cdn.example/old.mp4', sponsor_logos: [{ logo_url: 'https://cdn.example/sponsor.jpg' }] };
  preloadBrandAssets(settings); preloadBrandAssets(settings);
  expect(links().map(link => link.href)).toEqual(['https://cdn.example/crest.png?size=400&v=new%20upload']);
  expect(localStorage.getItem(key)).toBe('https://cdn.example/crest.png?size=400&v=new%20upload');
  expect(database.from).not.toHaveBeenCalled();
});

it('does not hand JSON animation data to the image loader and removes deleted logo cache entries', async () => {
  const { preloadBrandAssets } = await import('../src/utils/preloadBrand');
  preloadBrandAssets({ brand_logo_url: 'https://cdn.example/crest.json', updated_at: '2' });
  expect(links()).toHaveLength(0); expect(localStorage.getItem(key)).toContain('crest.json');
  preloadBrandAssets({ brand_logo_url: '' }); expect(localStorage.getItem(key)).toBeNull();
});

it('tolerates blocked storage and unsafe legacy cache values without breaking startup', async () => {
  localStorage.setItem(key, 'javascript:alert(1)');
  const { preloadBrandAssets, preloadLogoFromCache } = await import('../src/utils/preloadBrand');
  preloadLogoFromCache(); expect(links()).toHaveLength(0);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
  expect(() => preloadBrandAssets({ brand_logo_url: '/crest.webp' })).not.toThrow();
  expect(links()).toHaveLength(1);
});
