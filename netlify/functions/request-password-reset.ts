import type { Handler } from '@netlify/functions';
import crypto from 'node:crypto';
import { hashResetCode, normalizeResetEmail, resetHeaders as headers } from './lib/admin-reset';
import 'dotenv/config';
import { invitationBaseUrl } from './lib/admin-invitations';

export const handler: Handler = async (event) => {
  const reply = (statusCode: number, data: object) => ({ statusCode, headers, body: JSON.stringify(data) });
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Invalid request' }); }
  const email = normalizeResetEmail(input?.email);
  if (!email) return reply(400, { error: 'Enter a valid email address' });
  try {
    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient(true);
    const { data: admin, error } = await supabase.from('admin_users').select('email, role').eq('email', email).in('role', ['admin', 'owner']).maybeSingle();
    if (error) throw error;
    const success = { success: true, message: 'If this email is registered for admin access, a 6-digit verification code will arrive shortly.' };
    if (!admin) return reply(200, success);
    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const codeHash = hashResetCode(email, code);
    const { data: issued, error: issueError } = await supabase.rpc('issue_admin_reset_otp', { p_email: email, p_code_hash: codeHash });
    if (issueError) throw issueError;
    if (!issued) return reply(429, { error: 'Please wait 60 seconds before requesting another code.' });
    const { sendEmail } = await import('./lib/email');
    const recoveryUrl=`${invitationBaseUrl(event)}/forgot-password?email=${encodeURIComponent(email)}&amp;codeSent=1`;
    const result = await sendEmail({
      to: email, subject: 'RICORRENZA — Password reset verification code', provider: 'resend',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;background:#11131b;color:#f8eee4;border:1px solid #82634e;border-radius:16px"><h2>Password reset verification</h2><p>Enter this code on the RICORRENZA recovery screen:</p><p style="font-size:34px;letter-spacing:10px;color:#edc399;font-weight:bold">${code}</p><p><a href="${recoveryUrl}" style="color:#edc399">Open password recovery</a></p><p>This code expires in 10 minutes. Never share it with anyone.</p><p>If you did not request this, ignore this email.</p></div>`,
    });
    if (!result.success) {
      await supabase.from('admin_reset_otps').delete().eq('email', email).eq('code_hash', codeHash);
      throw new Error('Email delivery failed');
    }
    return reply(200, success);
  } catch {
    return reply(500, { error: 'Unable to send a verification code. Please try again shortly.' });
  }
};
