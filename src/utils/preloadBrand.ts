import { supabase } from '../lib/supabase';

/**
 * Dynamically inject preload links for ALL uploaded media across the site
 * Preloads: brand logo, hero media, committee photos, faculty, events, sponsors, guest artists
 * Run this before React mounts to ensure instant loading
 */
async function preloadBrandAssets() {
  try {
    const assetsToPreload: Array<{ url: string; type: 'image' | 'video' }> = [];

    // 1. Fetch homepage settings (brand logo + hero media)
    const { data: homepage } = await supabase
      .from('homepage_settings')
      .select('brand_logo_url, hero_media_url, sponsor_logos')
      .eq('id', 1)
      .maybeSingle();

    if (homepage) {
      // Brand logo
      if (homepage.brand_logo_url) {
        assetsToPreload.push({ url: homepage.brand_logo_url, type: 'image' });
      }

      // Hero media (image or video)
      if (homepage.hero_media_url) {
        const ext = homepage.hero_media_url.split('.').pop()?.toLowerCase();
        const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext || '');
        assetsToPreload.push({ 
          url: homepage.hero_media_url, 
          type: isVideo ? 'video' : 'image' 
        });
      }

      // Sponsor logos from homepage_settings
      if (homepage.sponsor_logos && Array.isArray(homepage.sponsor_logos)) {
        for (const sponsor of homepage.sponsor_logos) {
          if (sponsor?.logo_url) {
            assetsToPreload.push({ url: sponsor.logo_url, type: 'image' });
          }
        }
      }
    }

    // 2. Fetch core committee photos
    const { data: committee } = await supabase
      .from('core_committee')
      .select('photo_url')
      .not('photo_url', 'is', null);

    if (committee) {
      for (const member of committee) {
        if (member.photo_url) {
          assetsToPreload.push({ url: member.photo_url, type: 'image' });
        }
      }
    }

    // 3. Fetch faculty heads photos
    const { data: faculty } = await supabase
      .from('faculty_heads')
      .select('photo_url')
      .not('photo_url', 'is', null);

    if (faculty) {
      for (const head of faculty) {
        if (head.photo_url) {
          assetsToPreload.push({ url: head.photo_url, type: 'image' });
        }
      }
    }

    // 4. Fetch event images
    const { data: events } = await supabase
      .from('events')
      .select('image_url')
      .not('image_url', 'is', null);

    if (events) {
      for (const event of events) {
        if (event.image_url) {
          assetsToPreload.push({ url: event.image_url, type: 'image' });
        }
      }
    }

    // 5. Fetch sponsors
    const { data: sponsors } = await supabase
      .from('sponsors')
      .select('logo_url')
      .not('logo_url', 'is', null);

    if (sponsors) {
      for (const sponsor of sponsors) {
        if (sponsor.logo_url) {
          assetsToPreload.push({ url: sponsor.logo_url, type: 'image' });
        }
      }
    }

    // 6. Fetch guest/featured artists
    const { data: artists } = await supabase
      .from('guest_artists')
      .select('image');

    if (artists) {
      for (const artist of artists) {
        if (artist.image) {
          assetsToPreload.push({ url: artist.image, type: 'image' });
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

    console.log(`[Preload] Loaded ${uniqueUrls.size} assets (brand, hero, committee, faculty, events, sponsors, artists)`);
  } catch (err) {
    console.warn('[Preload] Failed to preload assets:', err);
  }
}

// Run before React initialization
preloadBrandAssets();

export { preloadBrandAssets };
