import { supabase } from '../lib/supabase';

/**
 * Preload ONLY critical above-the-fold assets for instant homepage loading
 * Preloads: brand logo, hero media, and homepage sponsor logos
 * Other assets are lazy-loaded via OptimizedImage/OptimizedVideo components
 */
async function preloadBrandAssets() {
  try {
    const assetsToPreload: Array<{ url: string; type: 'image' | 'video' }> = [];

    // Fetch only homepage settings (brand logo + hero media + homepage sponsors)
    const { data: homepage } = await supabase
      .from('homepage_settings')
      .select('brand_logo_url, hero_media_url, sponsor_logos')
      .eq('id', 1)
      .maybeSingle();

    if (homepage) {
      // Brand logo (critical - visible immediately)
      if (homepage.brand_logo_url) {
        assetsToPreload.push({ url: homepage.brand_logo_url, type: 'image' });
      }

      // Hero media (critical - LCP element)
      if (homepage.hero_media_url) {
        const ext = homepage.hero_media_url.split('.').pop()?.toLowerCase();
        const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext || '');
        assetsToPreload.push({ 
          url: homepage.hero_media_url, 
          type: isVideo ? 'video' : 'image' 
        });
      }

      // Sponsor logos from homepage_settings (visible on homepage)
      if (homepage.sponsor_logos && Array.isArray(homepage.sponsor_logos)) {
        for (const sponsor of homepage.sponsor_logos) {
          if (sponsor?.logo_url) {
            assetsToPreload.push({ url: sponsor.logo_url, type: 'image' });
          }
        }
      }
    }

    // Inject preload links for each unique asset
    const uniqueUrls = new Set<string>();
    
    for (const asset of assetsToPreload) {
      // Skip duplicates
      if (uniqueUrls.has(asset.url)) continue;
      uniqueUrls.add(asset.url);

      // Skip if preload already exists
      const existing = document.querySelector(`link[rel="preload"][href="${asset.url}"]`);
      if (existing) continue;

      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = asset.url;

      if (asset.type === 'video') {
        preloadLink.as = 'video';
        const ext = asset.url.split('.').pop()?.toLowerCase();
        if (ext === 'mp4') preloadLink.type = 'video/mp4';
        else if (ext === 'webm') preloadLink.type = 'video/webm';
        else if (ext === 'ogg') preloadLink.type = 'video/ogg';
        else preloadLink.type = 'video/mp4';
      } else {
        preloadLink.as = 'image';
        const ext = asset.url.split('.').pop()?.toLowerCase();
        if (ext === 'svg') preloadLink.type = 'image/svg+xml';
        else if (ext === 'png') preloadLink.type = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') preloadLink.type = 'image/jpeg';
        else if (ext === 'webp') preloadLink.type = 'image/webp';
      }

      document.head.appendChild(preloadLink);
    }

    console.log(`[Preload] Loaded ${uniqueUrls.size} critical assets (brand logo, hero media, homepage sponsors)`);
  } catch (err) {
    console.warn('[Preload] Failed to preload assets:', err);
  }
}

// Run before React initialization
preloadBrandAssets();

export { preloadBrandAssets };
