// Retrieve and cache client IP using a Netlify function.
// Falls back to empty string if unavailable (e.g., local dev without header).
let cachedIp: string | null = null;
let inFlight: Promise<string> | null = null;
let attempts = 0;

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
  if (import.meta.env.VITE_DISABLE_IP_FALLBACK) return '';
  const providers = [
    'https://api.ipify.org?format=json',
    'https://ipv4.icanhazip.com',
    'https://ifconfig.me/ip'
  ];
  for (const url of providers) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${url} status ${r.status}`);
      let ip = '';
      if (url.includes('format=json')) {
        const data = await r.json().catch(() => ({} as any));
        ip = typeof data.ip === 'string' ? data.ip.trim() : '';
      } else {
        const txt = await r.text();
        ip = txt.trim();
      }
      if (ip) return ip;
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[clientIp] Fallback provider failed:', url, e);
    }
  }
  return '';
}

export async function getClientIP(): Promise<string> {
  if (cachedIp) return cachedIp;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    attempts += 1;
    let ip = await tryNetlifyFunction();
    if (!ip) ip = await tryPublicFallback();
    // If still blank and under a few attempts, allow caller to schedule retries.
    cachedIp = ip || '';
    return cachedIp;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

export function getCachedIP(): string | null { return cachedIp; }

// Helper to aggressively (but safely) ensure we eventually obtain an IP.
// Tries up to maxAttempts with a spacing delay; resolves early if acquired.
export async function ensureClientIP(maxAttempts = 5, delayMs = 4000): Promise<string> {
  if (cachedIp) return cachedIp;
  for (let i = 0; i < maxAttempts; i++) {
    const ip = await getClientIP();
    if (ip) return ip;
    await new Promise(res => setTimeout(res, delayMs));
  }
  return cachedIp || '';
}
