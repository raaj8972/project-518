import { supabase } from '../lib/supabase';

const LOGO_CACHE_KEY = 'rico_brand_logo_url';

/**
 * Step 1 (synchronous, zero-latency):
 * Read the logo URL we cached last visit from localStorage and
 * inject a <link rel="preload"> immediately — before the DB responds.
 */
function preloadLogoFromCache() {
  try {
    const cachedUrl = localStorage.getItem(LOGO_CACHE_KEY);
    if (!cachedUrl) return;
    injectPreloadLink(cachedUrl, 'image');
    // Also prime the browser image cache by creating an Image object
    const img = new Image();
    img.src = cachedUrl;
  } catch (_) {
    // localStorage unavailable — silent fail
  }
}

/**
 * Step 2 (async, happens in background):
 * Fetch full homepage settings from Supabase.
 * Update the localStorage cache with fresh URLs so next visit is instant.
 */
async function fetchAndCacheAssets() {
  try {
    const { data: homepage } = await supabase
      .from('homepage_settings')
      .select('brand_logo_url, hero_media_url, sponsor_logos')
      .eq('id', 1)
      .maybeSingle();

    if (!homepage) return;

    const assetsToPreload: Array<{ url: string; type: 'image' | 'video' }> = [];

    // Brand logo
    if (homepage.brand_logo_url) {
      // Cache logo URL in localStorage for the NEXT page load
      try {
        localStorage.setItem(LOGO_CACHE_KEY, homepage.brand_logo_url);
      } catch (_) { /* quota exceeded - silent */ }
      assetsToPreload.push({ url: homepage.brand_logo_url, type: 'image' });
    }

    // Hero media
    if (homepage.hero_media_url) {
      const ext = homepage.hero_media_url.split('.').pop()?.toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext || '');
      assetsToPreload.push({ url: homepage.hero_media_url, type: isVideo ? 'video' : 'image' });
    }

    // Homepage sponsor logos
    if (homepage.sponsor_logos && Array.isArray(homepage.sponsor_logos)) {
      for (const sponsor of homepage.sponsor_logos) {
        if (sponsor?.logo_url) {
          assetsToPreload.push({ url: sponsor.logo_url, type: 'image' });
        }
      }
    }

    // Inject preload links for anything not already preloaded
    const uniqueUrls = new Set<string>();
    for (const asset of assetsToPreload) {
      if (uniqueUrls.has(asset.url)) continue;
      uniqueUrls.add(asset.url);
      injectPreloadLink(asset.url, asset.type);
    }

    console.log(`[Preload] Cached & preloaded ${uniqueUrls.size} critical assets`);
  } catch (err) {
    console.warn('[Preload] Failed to fetch/cache assets:', err);
  }
}

function injectPreloadLink(url: string, type: 'image' | 'video') {
  if (!url) return;
  const existing = document.querySelector(`link[rel="preload"][href="${url}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;

  if (type === 'video') {
    link.as = 'video';
    const ext = url.split('.').pop()?.toLowerCase();
    link.type = ext === 'webm' ? 'video/webm' : ext === 'ogg' ? 'video/ogg' : 'video/mp4';
  } else {
    link.as = 'image';
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'svg') link.type = 'image/svg+xml';
    else if (ext === 'png') link.type = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') link.type = 'image/jpeg';
    else if (ext === 'webp') link.type = 'image/webp';
  }

  document.head.appendChild(link);
}

// Export a helper so App.tsx can read the cached logo URL synchronously
// (for passing to Preloader before Supabase responds)
export function getCachedLogoUrl(): string | null {
  try {
    return localStorage.getItem(LOGO_CACHE_KEY);
  } catch {
    return null;
  }
}

// ── Run immediately ──
// Step 1 is synchronous (no await) — cached URL preloaded in <1ms
preloadLogoFromCache();
// Step 2 runs in background — updates cache for next visit
fetchAndCacheAssets();

export { fetchAndCacheAssets as preloadBrandAssets };
