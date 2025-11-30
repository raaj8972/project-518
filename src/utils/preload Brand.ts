import { supabase } from './lib/supabase';

/**
 * Dynamically inject preload links for uploaded brand logo
 * Run this before React mounts to ensure logo loads immediately
 */
async function preloadBrandAssets() {
  try {
    // Fetch brand logo URL from homepage settings
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('brand_logo_url')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data?.brand_logo_url) return;

    const logoUrl = data.brand_logo_url;
    
    // Check if preload already exists
    const existingPreload = document.querySelector(`link[rel="preload"][href="${logoUrl}"]`);
    if (existingPreload) return;

    // Inject preload link into head
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.href = logoUrl;
    
    // Determine type based on file extension
    const ext = logoUrl.split('.').pop()?.toLowerCase();
    if (ext === 'svg') {
      preloadLink.as = 'image';
      preloadLink.type = 'image/svg+xml';
    } else if (ext === 'png') {
      preloadLink.as = 'image';
      preloadLink.type = 'image/png';
    } else if (ext === 'jpg' || ext === 'jpeg') {
      preloadLink.as = 'image';
      preloadLink.type = 'image/jpeg';
    } else if (ext === 'webp') {
      preloadLink.as = 'image';
      preloadLink.type = 'image/webp';
    } else {
      preloadLink.as = 'image'; // Generic fallback
    }

    document.head.appendChild(preloadLink);
    console.log('[Preload] Brand logo:', logoUrl);
  } catch (err) {
    console.warn('[Preload] Failed to preload brand logo:', err);
  }
}

// Run before React initialization
preloadBrandAssets();

export { preloadBrandAssets };
