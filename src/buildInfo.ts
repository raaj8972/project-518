export const BUILD_INFO = {
  version: 'v5-vercel',
  commit: '0a0a186',
  buildDate: '2024-02-14',
  platform: 'vercel',
  apiBase: '/api'
};

// Log build info on startup
if (typeof window !== 'undefined') {
  console.log('[Build Info]', BUILD_INFO);
  console.log('[API Base URL]', BUILD_INFO.apiBase);
}
