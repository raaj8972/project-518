import { Handler } from '@netlify/functions';
import { hashResetToken } from './lib/admin-reset';

// Load environment variables for local testing
import 'dotenv/config';

export const handler: Handler = async (event) => {
  const headers = {
    // 'Access-Control-Allow-Origin': '*' // Restricted by policy,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { token, newPassword } = JSON.parse(event.body || '{}');
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof newPassword !== 'string' || newPassword.length < 8) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token and new password are required' }) };
    }

    // 1. Initialize Supabase
    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient(true); // privileged client

    // 2. Find token session
    let email: string | null = null;
    let storedToken = hashResetToken(token);
    // Fallback/Check Supabase if not found in Firestore
    if (!email) {
      let { data: sbToken, error: sbTokenErr } = await supabase
        .from('admin_reset_tokens')
        .select('email, expires_at')
        .eq('token', storedToken)
        .maybeSingle();
      if (sbTokenErr) throw sbTokenErr;
      // Honor unexpired links issued before the OTP rollout.
      if (!sbToken) {
        storedToken = token;
        const legacy = await supabase.from('admin_reset_tokens').select('email, expires_at').eq('token', storedToken).maybeSingle();
        if (legacy.error) throw legacy.error;
        sbToken = legacy.data;
      }

      if (sbToken) {
        const expiresAt = new Date(sbToken.expires_at);
        if (expiresAt > new Date()) {
          email = sbToken.email;
        }
      }
    }

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    }
    // 3. Resolve user UUID in Supabase
    // Using the resolveSupabaseUuid helper if possible, or direct query
    const { data: matchedUser, error: userError } = await supabase.from('admin_users').select('user_id').eq('email', email).in('role', ['admin', 'owner']).single();
    if (userError) throw userError;

    if (!matchedUser) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found in system' }) };
    }

    const userId = matchedUser.user_id;

    // Atomically claim this specific, unexpired token so concurrent requests cannot replay it.
    const { data: consumed, error: consumeError } = await supabase.from('admin_reset_tokens')
      .delete().eq('email', email).eq('token', storedToken).gt('expires_at', new Date().toISOString()).select('email');
    if (consumeError) throw consumeError;
    if (!consumed?.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired token. Request a new verification code.' }) };

    // 4. Update Password in Supabase
    console.log(`[confirm-password-reset] Updating Supabase password for: ${email}`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateErr) {
      console.error('[confirm-password-reset] Supabase update error:', updateErr);
      return { statusCode: 500, headers, body: JSON.stringify({ error: updateErr.message }) };
    }

    const { error: revokeError } = await supabase.rpc('revoke_user_sessions', { p_user_id:userId });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Password has been reset successfully. You can now log in.', ...(revokeError ? { warning:'Password reset succeeded, but existing sessions could not be revoked. Use Sessions & devices after signing in.' } : {}) })
    };

  } catch (err: any) {
    console.error('[confirm-password-reset] Fatal error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
};
