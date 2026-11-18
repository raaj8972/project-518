import type { getPortalLogoUrl } from '../components/cinematic/portalLogoUrl';

const LOGO_CACHE_KEY = 'rico_brand_logo_url';
type BrandingSettings = Parameters<typeof getPortalLogoUrl>[0];

function safeLogoUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function preloadLogo(url: string) {
  // Animated logo data belongs to BrandLogo3D, not the browser image loader.
  if (/\.json$/i.test(new URL(url).pathname)) return;
  if ([...document.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]')].some(link => link.href === url)) return;
  if (!document.head) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.setAttribute('as', 'image');
  link.href = url;
  document.head.appendChild(link);
}

/** Cache-only startup warmup; settings are fetched once by CoreDataProvider. */
export function preloadLogoFromCache() {
  const cached = safeLogoUrl(getCachedLogoUrl());
  if (cached) preloadLogo(cached);
}

/** Reuse the published settings response, including its upload version. */
export function preloadBrandAssets(settings: BrandingSettings) {
  if (!settings?.brand_logo_url?.trim()) {
    try { localStorage.removeItem(LOGO_CACHE_KEY); } catch { /* Optional storage. */ }
    return;
  }
  // Match Navbar's current URL construction exactly, including its version fallback.
  let publishedUrl = settings.brand_logo_url.trim();
  if (publishedUrl.startsWith('//')) publishedUrl = `https:${publishedUrl}`;
  if (publishedUrl.startsWith('http://')) publishedUrl = `https://${publishedUrl.slice(7)}`;
  const version = settings.updated_at || settings.brand_logo_size_px || '1';
  const url = safeLogoUrl(`${publishedUrl}${publishedUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}`);
  if (!url) return;
  try { localStorage.setItem(LOGO_CACHE_KEY, url); } catch { /* Optional storage. */ }
  preloadLogo(url);
}

export function getCachedLogoUrl(): string | null {
  try { return localStorage.getItem(LOGO_CACHE_KEY); } catch { return null; }
}

preloadLogoFromCache();
