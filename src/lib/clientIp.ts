// Retrieve and cache client IP using a Netlify function.
// Falls back to empty string if unavailable (e.g., local dev without header).
let cachedIp: string | null = null; // null => unresolved, non-empty string => resolved
let inFlight: Promise<string> | null = null;
let attempts = 0;
let lastError: any = null;

async function tryNetlifyFunction(): Promise<string> {
  try {
    const r = await fetch('/.netlify/functions/client-ip', { cache: 'no-store' });
    if (!r.ok) throw new Error(`netlify fn status ${r.status}`);
    const data = await r.json().catch(() => ({} as any));
    const ip = typeof data.ip === 'string' ? data.ip.trim() : '';
    return ip;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[clientIp] Netlify function failed or unavailable:', e);
    lastError = e;
    return '';
  }
}

async function trySupabaseEdge(): Promise<string> {
  try {
    const base = (import.meta as any).env.VITE_SUPABASE_URL;
    if (!base) return '';
    const r = await fetch(`${base}/functions/v1/client-ip`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`supabase edge fn status ${r.status}`);
    const data = await r.json().catch(() => ({} as any));
    const ip = typeof data.ip === 'string' ? data.ip.trim() : '';
    return ip;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[clientIp] Supabase edge function failed:', e);
    lastError = e; return '';
  }
}

async function tryWebRTC(): Promise<string> {
  if (typeof RTCPeerConnection === 'undefined') return '';
  return await new Promise<string>(resolve => {
    let done = false;
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.createDataChannel('x');
      pc.onicecandidate = ev => {
        if (!ev || !ev.candidate) {
          if (!done) { done = true; resolve(''); pc.close(); }
          return;
        }
        const cand = ev.candidate.candidate;
        const match = cand.match(/candidate:[^ ]+ [^ ]+ [^ ]+ [^ ]+ ([0-9a-fA-F:\.]+) /);
        if (match) {
          const ip = match[1];
          if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.|::1)/.test(ip)) {
            if (!done) { done = true; resolve(ip); pc.close(); }
          }
        }
      };
      pc.createOffer().then(o => pc.setLocalDescription(o));
      setTimeout(() => { if (!done) { done = true; resolve(''); pc.close(); } }, 4000);
    } catch { resolve(''); }
  });
}

async function tryPublicFallback(): Promise<string> {
  if (import.meta.env.VITE_DISABLE_IP_FALLBACK) return '';
  const providers = [
    'https://api.ipify.org?format=json', // json
    'https://api.ipify.org',            // plain
    'https://checkip.amazonaws.com',    // plain
    'https://ipv4.icanhazip.com',       // plain
    'https://ifconfig.me/ip',           // plain
    'https://www.cloudflare.com/cdn-cgi/trace' // key=value lines
  ];
  // Race providers with an overall timeout per request
  const perFetch = async (url: string): Promise<string> => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const r = await fetch(url, { cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(`${url} status ${r.status}`);
      let ip = '';
      if (url.includes('format=json')) {
        const data = await r.json().catch(() => ({} as any));
        ip = typeof data.ip === 'string' ? data.ip.trim() : '';
      } else if (url.includes('cdn-cgi/trace')) {
        const txt = await r.text();
        // e.g. ip=203.0.113.1
        const match = txt.match(/ip=([^\n]+)/);
        ip = match ? match[1].trim() : '';
      } else {
        const txt = await r.text();
        ip = txt.trim();
      }
      return ip;
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[clientIp] provider failed', url, e);
      lastError = e;
      return '';
    }
  };
  // Run sequentially but stop early when found to better respect provider policies.
  for (const p of providers) {
    const ip = await perFetch(p);
    if (ip) return ip;
  }
  return '';
}

export async function getClientIP(): Promise<string> {
  if (cachedIp !== null) return cachedIp;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    attempts += 1;
    let resolved: string | null = null;

    const settle = (val: string) => {
      if (val && !resolved) {
        resolved = val;
        cachedIp = val;
      }
    };

    // Phase 1: quick parallel (Netlify + Supabase Edge + ipify json)
    await Promise.all([
      (async () => { try { const v = await tryNetlifyFunction(); settle(v); } catch {} })(),
      (async () => { try { const v = await trySupabaseEdge(); settle(v); } catch {} })(),
      (async () => { try {
        const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        if (r.ok) { const data = await r.json().catch(()=>({} as any)); const ip = (data.ip||'').trim(); settle(ip); }
      } catch(e){ lastError = e; } })(),
    ]);
    if (resolved) return resolved;

    // Phase 2: WebRTC attempt (may succeed when HTTP providers blocked)
    try { const rtc = await tryWebRTC(); settle(rtc); } catch {}
    if (resolved) return resolved;

    // Phase 3: sequential public providers (remaining)
    try {
      const seq = await tryPublicFallback();
      settle(seq);
    } catch {}

    // Cache even if empty? We choose NOT to cache empty so future ensureClientIP can retry.
    if (!resolved) cachedIp = null; // keep as unresolved for subsequent calls
    return resolved || '';
  })().finally(() => { inFlight = null; });
  return inFlight;
}

export function getCachedIP(): string | null { return cachedIp; }

export function forceRetryClientIP() {
  cachedIp = null; inFlight = null; // allow a fresh resolution attempt
}

// Helper to aggressively (but safely) ensure we eventually obtain an IP.
// Tries up to maxAttempts with a spacing delay; resolves early if acquired.
export async function ensureClientIP(maxAttempts = 6, delayMs = 3500): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const ip = await getClientIP();
    if (ip) return ip;
    forceRetryClientIP();
    await new Promise(res => setTimeout(res, delayMs));
  }
  return getCachedIP() || '';
}

// Force a manual retry (used by UI retry button)
// Retain backwards compatibility for earlier import usage expecting a promise
export async function legacyForceRetryClientIP(): Promise<string> {
  forceRetryClientIP(); attempts = 0; lastError = null; return getClientIP();
}

export function getLastClientIpError(): any { return lastError; }
