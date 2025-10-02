// Retrieve and cache client IP using a Netlify function.
// Falls back to empty string if unavailable (e.g., local dev without header).
let cachedIp: string | null = null;
let inFlight: Promise<string> | null = null;

async function tryNetlifyFunction(): Promise<string> {
  try {
    const r = await fetch('/.netlify/functions/client-ip', { cache: 'no-store' });
    if (!r.ok) throw new Error(`netlify fn status ${r.status}`);
    const data = await r.json().catch(() => ({} as any));
    const ip = typeof data.ip === 'string' ? data.ip.trim() : '';
    return ip;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[clientIp] Netlify function failed or unavailable:', e);
    return '';
  }
}

async function tryPublicFallback(): Promise<string> {
  // Public fallback (only if no IP yet). Uses ipify. Can be disabled by env variable.
  if (import.meta.env.VITE_DISABLE_IP_FALLBACK) return '';
  try {
    const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`ipify status ${r.status}`);
    const data = await r.json().catch(() => ({} as any));
    const ip = typeof data.ip === 'string' ? data.ip.trim() : '';
    return ip;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[clientIp] Fallback ipify failed:', e);
    return '';
  }
}

export async function getClientIP(): Promise<string> {
  if (cachedIp) return cachedIp;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    // 1. Try Netlify function (works when running through netlify dev or deployed site)
    let ip = await tryNetlifyFunction();
    // 2. If blank, attempt public fallback (useful when just running vite/preview locally)
    if (!ip) ip = await tryPublicFallback();
    cachedIp = ip || '';
    return cachedIp;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

export function getCachedIP(): string | null { return cachedIp; }
