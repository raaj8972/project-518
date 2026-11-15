import type { Handler } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { getSupabaseClient } from './lib/supabase';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { eventId, password } = JSON.parse(event.body || '{}');
    if (!eventId || typeof password !== 'string' || password.length > 128) return reply(400, { error: 'Event and access code are required' });
    const client = getSupabaseClient(true);
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || event.headers['client-ip'] || 'local';
    const { data: limit, error: limitError } = await client.rpc('check_rate_limit', { request_ip: ip });
    if (limitError) return reply(503, { error: 'Login service is unavailable. Check database migrations.' });
    if (limit && !limit.allowed) return reply(429, { error: 'Too many attempts. Please try again later.' });
    const { data: valid, error } = await client.rpc('verify_coordinator_password_secure', { p_event_id: String(eventId), p_password: password.trim() });
    if (error) return reply(503, { error: 'Coordinator login is unavailable. Apply the functionality repair migration.' });
    if (!valid) {
      await client.rpc('record_failed_attempt', { request_ip: ip });
      return reply(401, { error: 'Invalid access code' });
    }
    const email = `coordinator-${createHash('sha256').update(String(eventId)).digest('hex').slice(0, 32)}@staff.ricorrenza.fun`;
    const { data, error: linkError } = await client.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkError || !data.user) throw new Error('Could not establish coordinator identity');
    const { error: metadataError } = await client.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...data.user.app_metadata, role: 'coordinator', coordinator_event_id: String(eventId) },
    });
    if (metadataError) throw metadataError;
    return reply(200, { token_hash: data.properties.hashed_token, type: 'magiclink' });
  } catch {
    return reply(500, { error: 'Could not sign in. Check the server configuration.' });
  }
};
