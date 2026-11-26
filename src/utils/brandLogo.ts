import { DEFAULT_BRAND_LOGO, getPortalLogoUrl } from '../components/cinematic/portalLogoUrl';
import { getCachedLogoUrl } from './preloadBrand';

export { DEFAULT_BRAND_LOGO, getPortalLogoUrl };

export type BrandSettingsLike = {
  brand_logo_url?: string | null;
  updated_at?: string | null;
  brand_logo_size_px?: number | null;
} | null | undefined;

export function isLegacyBlockedLogoUrl(url: string | null | undefined): boolean {
  return !!url && /\/favicon\.svg(?:$|[?#])/i.test(url.trim());
}

/**
 * Always resolves to the published brand logo (`brand_logo_url`), optional cached
 * brand logo while settings load, or the official Ricorrenza crest—never `/favicon.svg`.
 */
export function resolveBrandLogoUrl(
  settings: BrandSettingsLike,
  { allowCachedWhileLoading = false }: { allowCachedWhileLoading?: boolean } = {}
): string {
  if (settings?.brand_logo_url?.trim() && !isLegacyBlockedLogoUrl(settings.brand_logo_url)) {
    return getPortalLogoUrl(settings);
  }
  if (allowCachedWhileLoading && settings == null) {
    const cached = getCachedLogoUrl();
    if (cached && !isLegacyBlockedLogoUrl(cached)) return cached;
  }
  return DEFAULT_BRAND_LOGO;
}

export function isLottieLogoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.json(?:$|[?#])/i.test(url.trim());
}
