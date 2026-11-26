/** Official default emblem when no custom brand_logo_url is published. */
export const DEFAULT_BRAND_LOGO = '/images/ricorrenza-medical-mark.svg';

/** Use the same published branding setting and upload version as the navbar. */
export function getPortalLogoUrl(settings: {
  brand_logo_url?: string | null;
  updated_at?: string | null;
  brand_logo_size_px?: number | null;
} | null) {
  let url = settings?.brand_logo_url?.trim();
  if (!url || /\/favicon\.svg(?:$|[?#])/i.test(url)) return DEFAULT_BRAND_LOGO;
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('http://')) url = `https://${url.slice(7)}`;
  if (/^(data:|blob:)/i.test(url)) return url;
  const [path, hash] = url.split('#', 2);
  const version = settings?.updated_at || settings?.brand_logo_size_px || '1';
  return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}${hash === undefined ? '' : `#${hash}`}`;
}
