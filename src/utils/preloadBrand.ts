import { supabase } from '../lib/supabase';

/**
 * Dynamically inject preload links for uploaded brand assets
 * Preloads: brand logo, hero images, hero videos
 * Run this before React mounts to ensure instant loading
 */
async function preloadBrandAssets() {
  try {
    // Fetch all media URLs from homepage settings
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('brand_logo_url, hero_media_url')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return;

    const assetsToPreload: Array<{ url: string; type: 'image' | 'video' }> = [];

    // Add brand logo
    if (data.brand_logo_url) {
      assetsToPreload.push({ url: data.brand_logo_url, type: 'image' });
    }

    // Add hero media (image or video)
    if (data.hero_media_url) {
      const ext = data.hero_media_url.split('.').pop()?.toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext || '');
      assetsToPreload.push({ 
        url: data.hero_media_url, 
        type: isVideo ? 'video' : 'image' 
      });
    }

    // Inject preload links for each asset
    for (const asset of assetsToPreload) {
      // Skip if preload already exists
      const existing = document.querySelector(`link[rel="preload"][href="${asset.url}"]`);
      if (existing) continue;

      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = asset.url;

      if (asset.type === 'video') {
        preloadLink.as = 'video';
        // Determine video MIME type
        const ext = asset.url.split('.').pop()?.toLowerCase();
        if (ext === 'mp4') preloadLink.type = 'video/mp4';
        else if (ext === 'webm') preloadLink.type = 'video/webm';
        else if (ext === 'ogg') preloadLink.type = 'video/ogg';
        else preloadLink.type = 'video/mp4'; // fallback
      } else {
        preloadLink.as = 'image';
        // Determine image MIME type
        const ext = asset.url.split('.').pop()?.toLowerCase();
        if (ext === 'svg') preloadLink.type = 'image/svg+xml';
        else if (ext === 'png') preloadLink.type = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') preloadLink.type = 'image/jpeg';
        else if (ext === 'webp') preloadLink.type = 'image/webp';
        // else: browser will auto-detect
      }

      document.head.appendChild(preloadLink);
      console.log(`[Preload] ${asset.type}:`, asset.url);
    }
  } catch (err) {
    console.warn('[Preload] Failed to preload assets:', err);
  }
}

// Run before React initialization
preloadBrandAssets();

export { preloadBrandAssets };
