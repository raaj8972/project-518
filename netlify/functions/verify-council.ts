import { trustedClientIp } from './lib/client-ip';
import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { createCouncilSessionToken, getCouncilCookieHeader } from './lib/council-session';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown, extraHeaders: Record<string, string> = {}) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });

  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { passcode } = JSON.parse(event.body || '{}');
    if (typeof passcode !== 'string' || passcode.length > 128 || !passcode.trim()) return reply(400, { error: 'Passcode required' });
    const client = getSupabaseClient(true);
    const ip = trustedClientIp(event.headers);
    const { data: limit, error: limitError } = await client.rpc('check_rate_limit', { request_ip: ip });
    if (limitError || !limit || typeof limit.allowed !== 'boolean') return reply(503, { error: 'Login service unavailable' });
    if (!limit.allowed) return reply(429, { error: 'Too many attempts. Please try again later.' });
    const { data: valid, error } = await client.rpc('verify_council_password', { p_password: passcode.trim() });
    if (error) return reply(503, { error: 'Council access is not configured. Apply the repair migration.' });
    if (!valid) { await client.rpc('record_failed_attempt', { request_ip: ip }); return reply(401, { error: 'Invalid passcode' }); }

    // Mint short-lived, encrypted, HttpOnly council session token
    const token = createCouncilSessionToken(passcode.trim());
    return reply(200, { success: true, token }, {
      'Set-Cookie': getCouncilCookieHeader(token)
    });
  } catch { return reply(500, { error: 'Council login unavailable' }); }
};
