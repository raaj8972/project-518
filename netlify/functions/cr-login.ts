import { trustedClientIp } from './lib/client-ip';
import type { Handler } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { getSupabaseClient } from './lib/supabase';
import { issueStaffMagicLink } from './lib/staff-session';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { batch, password } = JSON.parse(event.body || '{}');
    if (typeof batch !== 'string' || typeof password !== 'string' || password.length > 128) return reply(400, { error: 'Batch and password required' });
    const client = getSupabaseClient(true);
    const ip = trustedClientIp(event.headers);
    const { data: limit, error: limitError } = await client.rpc('check_rate_limit', { request_ip: ip });
    if (limitError) return reply(503, { error: 'Login service unavailable' });
    if (limit && !limit.allowed) return reply(429, { error: 'Too many attempts' });
    const { data: valid, error } = await client.rpc('verify_cr_login', { p_batch: batch, p_password: password.trim() });
    if (error) return reply(503, { error: 'CR access is unavailable. Apply the repair migration.' });
    if (!valid) { await client.rpc('record_failed_attempt', { request_ip: ip }); return reply(401, { error: 'Invalid batch password' }); }
    const email = `cr-${createHash('sha256').update(batch).digest('hex').slice(0, 32)}@staff.ricorrenza.fun`;
    const session = await issueStaffMagicLink(client, email, { role: 'cr', cr_batch: batch });
    return reply(200, session);
  } catch { return reply(500, { error: 'CR login unavailable' }); }
};
