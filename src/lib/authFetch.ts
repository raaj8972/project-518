import { supabase, SUPABASE_HOST } from './supabase';

/**
 * Ensure there is a valid Supabase session and return the access token.
 * Throws Error('no-session') if no session is available or refresh failed.
 */
export const ensureValidSession = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      // Bubble up refresh-token style errors so callers can handle gracefully
      if (msg.includes('invalid refresh token') || msg.includes('refresh token not found')) {
        // Force sign out to clear stale tokens
        try { await supabase.auth.signOut(); } catch {}
        throw new Error('no-session');
      }
      throw new Error('no-session');
    }
    const session = (data as any)?.session;
    const token = session?.access_token as string | undefined;
    if (!token) {
      throw new Error('no-session');
    }
    return token;
  } catch (e) {
    // Normalize to 'no-session' for callers
    throw new Error('no-session');
  }
};

/**
 * Simple fetch wrapper which attaches the current Supabase access token.
 * On 401 responses it forces sign-out (to clear bad refresh) and throws.
 */
export const fetchWithAuth = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = await ensureValidSession();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    // Try to detect invalid refresh semantics in the response body
    try {
      const text = await res.text();
      const low = String(text || '').toLowerCase();
      if (low.includes('invalid refresh token') || low.includes('refresh token not found')) {
        try { await supabase.auth.signOut(); } catch {}
      }
    } catch {}
    throw new Error('unauthorized');
  }
  return res;
};

export { SUPABASE_HOST };
