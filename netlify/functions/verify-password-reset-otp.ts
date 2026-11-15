import type { Handler } from '@netlify/functions';
import crypto from 'node:crypto';
import { hashResetCode, hashResetToken, normalizeResetEmail, resetHeaders as headers } from './lib/admin-reset';
import 'dotenv/config';

export const handler: Handler = async (event) => {
  const reply = (statusCode: number, data: object) => ({ statusCode, headers, body: JSON.stringify(data) });
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Invalid request' }); }
  const email = normalizeResetEmail(input?.email);
  if (!email || typeof input?.code !== 'string' || !/^\d{6}$/.test(input.code)) return reply(400, { error: 'Enter your email and the 6-digit code.' });
  try {
    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient(true);
    const token = crypto.randomBytes(32).toString('hex');
    const { data, error } = await supabase.rpc('verify_admin_reset_otp', { p_email: email, p_code_hash: hashResetCode(email, input.code), p_reset_hash: hashResetToken(token) });
    if (error) throw error;
    if (data !== 'verified') return reply(400, { error: data === 'locked' ? 'Too many incorrect attempts. Request a new code.' : 'Invalid or expired code. Check your code or request a new one.' });
    return reply(200, { success: true, token });
  } catch { return reply(500, { error: 'Unable to verify the code. Please try again.' }); }
};
