import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { passcode } = JSON.parse(event.body || '{}');
    if (typeof passcode !== 'string' || passcode.length > 128 || !passcode.trim()) return reply(400, { error: 'Passcode required' });
    const client = getSupabaseClient(true);
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'local';
    const { data: limit, error: limitError } = await client.rpc('check_rate_limit', { request_ip: ip });
    if (limitError) return reply(503, { error: 'Login service unavailable' });
    if (limit && !limit.allowed) return reply(429, { error: 'Too many attempts. Please try again later.' });
    const { data: valid, error } = await client.rpc('verify_council_password', { p_password: passcode.trim() });
    if (error) return reply(503, { error: 'Council access is not configured. Apply the repair migration.' });
    if (!valid) { await client.rpc('record_failed_attempt', { request_ip: ip }); return reply(401, { error: 'Invalid passcode' }); }
    return reply(200, { success: true });
  } catch { return reply(500, { error: 'Council login unavailable' }); }
};
