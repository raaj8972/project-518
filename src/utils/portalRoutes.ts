/** These workspaces and access pages never mount public-site spider effects. */
const PORTAL_ROUTES = [
  '/admin', '/dashboard', '/coordinator', '/cr', '/security', '/security-login',
  '/security-dashboard', '/council', '/council-dashboard', '/sports-admin',
  '/accept-admin-invite', '/login', '/student', '/forgot-password', '/reset-password', '/master-node-access',
];

export function isPortalRoute(pathname: string): boolean {
  const path = pathname.split(/[?#]/, 1)[0].toLowerCase();
  return PORTAL_ROUTES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

/** The festival experience includes students; staff workspaces keep their own appearance. */
export function isFestivalRoute(pathname: string): boolean {
  const path = pathname.split(/[?#]/, 1)[0].toLowerCase();
  return !isPortalRoute(path) || path === '/dashboard' || path.startsWith('/dashboard/') || path === '/student' || path.startsWith('/student/');
}
