// Every value here is intentionally downloadable by visitors. Unknown VITE_* keys stay private.
export const PUBLIC_ENV_KEYS = new Set([
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_DISABLE_REALTIME',
  'VITE_DEBUG_SUPABASE_LOGS', 'VITE_DEBUG_SHOW_SUPABASE_HOST', 'VITE_FETCH_MAX_RETRIES',
  'VITE_FETCH_TIMEOUT_MS', 'VITE_R2_PUBLIC_DOMAIN', 'VITE_IMAGE_PROXY_URL',
  'VITE_CLOUDINARY_CLOUD_NAME', 'VITE_CLOUDINARY_UPLOAD_PRESET',
  'VITE_LIVE_LEAD_MINUTES', 'VITE_INLINE_COUNTDOWN_THRESHOLD_MIN',
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_DATABASE_URL', 'VITE_SITE_URL',
]);

export function publicEnvironment(env: Record<string, string>) {
  const result = Object.fromEntries(Object.entries(env).filter(([key]) => PUBLIC_ENV_KEYS.has(key)));
  const key = result.VITE_SUPABASE_ANON_KEY;
  if (key && !key.startsWith('sb_publishable_')) {
    try {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (claims.role !== 'anon') throw new Error('not anonymous');
    } catch { throw new Error('VITE_SUPABASE_ANON_KEY must be a public anonymous or publishable key'); }
  }
  return result;
}
