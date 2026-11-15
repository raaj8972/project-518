import type { Handler } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { getSupabaseClient } from './lib/supabase';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password || password.length > 128) return reply(400, { error: 'Name and PIN/password are required' });
    const client = getSupabaseClient(true);
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'local';
    const { data: limit, error: limitError } = await client.rpc('check_rate_limit', { request_ip: ip });
    if (limitError) return reply(503, { error: 'Login service unavailable' });
    if (limit && !limit.allowed) return reply(429, { error: 'Too many attempts' });
    const { data, error } = await client.rpc('authenticate_security_user', { p_username: username.trim(), p_password: password });
    if (error || !data?.success) { await client.rpc('record_failed_attempt', { request_ip: ip }); return reply(401, { error: 'Invalid name or PIN/password' }); }
    const identity=data.user.username;
    if(typeof identity!=='string'||!identity)throw new Error('Identity unavailable');
    const email = `security-${createHash('sha256').update(identity).digest('hex').slice(0, 32)}@staff.ricorrenza.fun`;
    const { data: link, error: linkError } = await client.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkError || !link.user) throw new Error('Identity unavailable');
    const { error: metadataError } = await client.auth.admin.updateUserById(link.user.id, { app_metadata: { ...link.user.app_metadata, role: 'security', security_username: identity } });
    if (metadataError) throw metadataError;
    return reply(200, { user: data.user, token_hash: link.properties.hashed_token });
  } catch { return reply(500, { error: 'Security login is unavailable. Check the server configuration.' }); }
};
