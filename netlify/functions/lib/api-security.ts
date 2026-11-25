import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './supabase';
import { verifyAdmin, verifyToken } from './auth-verify';
import { ADMIN_PAGES } from '../../../shared/adminAccess';
import { createHash } from 'node:crypto';
import { trustedClientIp } from './client-ip';

type Policy = 'owner' | 'admin' | 'user' | readonly string[];
const policies: Record<string, Policy> = {
  'broadcast-schedule': ['registrations'],
  'list-admin-users': 'owner', 'force-logout': 'owner', 'coordinator-ai-groups': 'user',
  'passkey-list': 'admin', 'passkey-delete': 'admin',
  'add-admin-user': 'owner', 'update-admin-email': 'owner', 'grant-permissions': 'owner',
  'install-heartbeat': 'owner', 'heartbeat': 'admin', 'heartbeat_fallback': 'admin',
  'index-faces-batch': ['gallery'], 'sync-google-drive': ['gallery'], 'sync-drive-folders': ['gallery'],
  'notify-event-update': ['events', 'registrations'],
  'send-confirmation': ['registrations'], 'send-rejection': ['registrations'], 'send-custom-email': ['registrations'],
  'update-form-settings': ['auditions', 'memberships', 'homebound'],
  'ai-extract-iqmg-roster': ['student-system'],
  'ai-extract-events': ['events'], 'ai-generate-event': ['events'], 'ai-extract-schedule': ['schedule'],
  'ai-extract-sponsors': ['sponsors'], 'ai-extract-tiers': ['sponsors'],
  'ai-extract-core-team': ['rico-family'], 'ai-extract-homebound': ['homebound'],
  'ai-extract-passwords': 'owner', 'ai-chat': 'admin', 'ai-check-models': 'admin', 'ai-generate-content': 'admin',
  'get-event-candidates': ['events', 'registrations'], 'delete-r2-file': 'admin', 'get-r2-upload-url': 'admin',
};
const publicReads = new Set(['health', 'public-security-settings', 'image-proxy', 'drive-proxy']);
const readRoutes = new Set([...publicReads, 'list-admin-users', 'broadcast-schedule']);
const json = (statusCode: number, error: string) => ({ statusCode, body: JSON.stringify({ error }), headers: { 'Content-Type': 'application/json' } });
const privateHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const metered = new Set(['passkey-challenge', 'passkey-register', 'passkey-login', 'get-r2-upload-url',
  'index-faces-batch', 'image-proxy', 'drive-proxy', 'notify-event-update', 'send-confirmation', 'send-rejection', 'send-custom-email', 'coordinator-ai-groups', 'broadcast-schedule']);

async function rateLimit(name: string, event: any, client: any, userId = '') {
  if (!metered.has(name) && !name.startsWith('ai-')) return null;
  // These headers are supplied by the hosting edge. Do not trust client-ip or arbitrary X-Forwarded-For.
  const ip = trustedClientIp(event.headers);
  const key = createHash('sha256').update(`${name}:${userId}:${ip}`).digest('hex');
  const { data, error } = await client.rpc('consume_api_rate_limit', { p_key: key, p_limit: publicReads.has(name) ? 120 : 30, p_window: 60 });
  if (error) return json(503, 'Request protection is unavailable');
  return data === true ? null : json(429, 'Too many requests. Please try again later.');
}

async function authorize(name: string, event: any) {
  const headers = event.headers || {};
  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') return { statusCode: 204, body: '', headers: { ...privateHeaders } };
  const allowed = name === 'broadcast-schedule' ? ['GET', 'POST'] : readRoutes.has(name) ? ['GET', 'HEAD'] : name === 'delete-r2-file' ? ['POST', 'DELETE'] : ['POST'];
  if (!allowed.includes(method)) return { ...json(405, 'Method not allowed'), headers: { Allow: allowed.join(', ') } };
  if (Buffer.byteLength(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8') > 6 * 1024 * 1024) return json(413, 'Request too large');
  if (headers.origin || headers.Origin) {
    const allowedOrigins = new Set(['https://ricorrenza.fun', 'https://www.ricorrenza.fun']);
    for (const value of [process.env.APP_URL, process.env.SITE_URL, process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]) {
      try { if (value) allowedOrigins.add(new URL(value).origin); } catch { /* Ignore invalid configuration. */ }
    }
    const origin = headers.origin || headers.Origin;
    const local = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (!local && !allowedOrigins.has(origin)) return json(403, 'Origin not allowed');
  }
  // Scheduled mail has its own server credential. Manual sends still require assigned page access.
  if (name === 'broadcast-schedule' && method === 'GET' && process.env.CRON_SECRET
    && (headers.authorization || headers.Authorization) === `Bearer ${process.env.CRON_SECRET}`) return null;
  const policy = policies[name];
  // Native WebAuthn handlers validate their challenge/session themselves. Public
  // reads are explicit; an unclassified new endpoint must never silently open.
  if (!policy) {
    if (publicReads.has(name) || ['passkey-challenge', 'passkey-register', 'passkey-login', 'master-login', 'coordinator-toggle-registration'].includes(name)) {
      return metered.has(name) ? rateLimit(name, event, getSupabaseClient(true)) : null;
    }
    return json(403, 'Endpoint access policy is not configured');
  }
  const token = headers.authorization || headers.Authorization;
  if (!token) return json(401, 'Sign in required');
  const client = getSupabaseClient(true);
  if (policy === 'user') {
    const user = await verifyToken(token, client);
    return user ? rateLimit(name, event, client, user.id) : json(401, 'Invalid session');
  }
  const auth = await verifyAdmin(token, client);
  if (!auth.user) return json(401, 'Invalid session');
  if (!auth.isAdmin || (policy === 'owner' && !auth.isOwner)) return json(403, 'Insufficient permissions');
  if (typeof policy === 'string' || auth.isOwner) return rateLimit(name, event, client, auth.user.id);
  const { data: permission, error } = await client.from('admin_permissions').select('*').eq('user_id', auth.user.id).maybeSingle();
  const permitted = !error && permission && (permission.page_access_configured
    ? Array.isArray(permission.allowed_pages) && policy.some(page => permission.allowed_pages.includes(page))
    : ADMIN_PAGES.some(page => policy.includes(page.id) && page.flag && permission[page.flag] === true));
  return permitted ? rateLimit(name, event, client, auth.user.id) : json(403, 'This management page is not assigned to your account');
}

// Guard the native export so Netlify, Vercel and local execution agree.
export function secureEvent(name: string, implementation: Handler): Handler {
  return async (event, context) => {
    try {
      const denied = await authorize(name, event);
      const result: any = denied || await implementation(event, context, () => {});
      if (!result) return { ...json(500, 'Request failed'), headers: { ...privateHeaders, 'Content-Type': 'application/json' } };
      if (result.statusCode >= 500) return { ...json(result.statusCode, 'Service unavailable. Please try again.'), headers: { ...privateHeaders, 'Content-Type': 'application/json' } };
      return { ...result, headers: { ...privateHeaders, ...result.headers,
        ...(!publicReads.has(name) ? { 'Cache-Control': 'no-store' } : {}) } };
    } catch { return { ...json(500, 'Service unavailable. Please try again.'), headers: { ...privateHeaders, 'Content-Type': 'application/json' } }; }
  };
}

export function secureRequest(name: string, implementation: (request: Request) => Promise<Response>) {
  const secured = secureEvent(name, async (event: any) => {
    const response = await implementation(event.originalRequest);
    return { statusCode: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()).toString('base64'), isBase64Encoded: true };
  });
  return async (request: Request) => {
    const body = ['GET', 'HEAD'].includes(request.method) ? '' : await request.clone().text();
    const result: any = await secured({ httpMethod: request.method, headers: Object.fromEntries(request.headers), body, originalRequest: request } as any, {} as any, () => {});
    return new Response(result.statusCode === 204 ? null : result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body, { status: result.statusCode, headers: result.headers });
  };
}
