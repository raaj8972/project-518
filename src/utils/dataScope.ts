import { SITE_FEATURES, isSportsSection } from '../constants/siteFeatures';
export function getDataScope(pathname: string, privateAdmin: boolean) {
  const admin = pathname.startsWith('/admin') && privateAdmin;
  const home = pathname === '/' || pathname === '/health';
  const dashboard = pathname.startsWith('/dashboard');
  return {
    events: admin || home || dashboard || ['/events', '/schedule', '/coordinator'].some(p => pathname.startsWith(p)),
    personnel: admin || home || ['/rico-family', '/home-bound', '/sponsors'].some(p => pathname.startsWith(p)),
    management: admin || home || pathname.startsWith('/sponsors'),
    privateManagement: admin,
    sports: SITE_FEATURES.sports && admin,
    annualSports: SITE_FEATURES.sports && (admin || pathname === '/sports' || dashboard),
    gallery: admin || pathname.startsWith('/gallery'),
  };
}

export function pendingLandingPath(pathname: string, landing: unknown, admin: boolean): string | null {
  if (pathname !== '/' || admin || typeof landing !== 'string' || !landing.startsWith('/') || landing.startsWith('//') || landing === '/') return null;
  try { if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rico_landed')) return null; } catch { return null; }
  if (!SITE_FEATURES.sports && isSportsSection(landing.replace(/^\//, ''))) return null;
  return landing;
}
