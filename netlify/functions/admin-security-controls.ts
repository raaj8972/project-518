import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { verifyAdmin } from './lib/auth-verify';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const client = getSupabaseClient(true);
    const { action, targetUserId, enable, password, newPassword } = JSON.parse(event.body || '{}');
    const auth = await verifyAdmin(event.headers.authorization, client);
    if (!auth.user || !auth.isAdmin) return reply(401, { error: 'An administrator session is required. Use password recovery if you cannot sign in.' });
    if (action === 'verify_password') {
      if (typeof password !== 'string' || !password) return reply(400, { error: 'Enter your account password' });
      const checker = getSupabaseClient(false);
      const { data, error } = await checker.auth.signInWithPassword({ email: auth.user.email!, password });
      if (data.session) await checker.auth.signOut({ scope: 'local' });
      if (error || data.user?.id !== auth.user.id) return reply(403, { error: 'Incorrect password' });
      return reply(200, { success: true });
    }
    if (action === 'update_password' && targetUserId === auth.user.id) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) return reply(400, { error: 'Password must contain at least 8 characters' });
      const { error } = await client.auth.admin.updateUserById(auth.user.id, { password: newPassword });
      if (error) throw error;
      const { error: revokeError } = await client.rpc('revoke_user_sessions', { p_user_id: auth.user.id });
      return reply(200, { success: true, ...(revokeError ? { warning:'Your password was saved, but existing sessions could not be signed out. Use Sessions & devices to retry.' } : {}) });
    }
    if (action === 'force_logout' && (auth.isOwner || targetUserId === auth.user.id)) {
      if (!targetUserId) return reply(400, { error: 'Select a user' });
      const { error } = await client.rpc('revoke_user_sessions', { p_user_id: targetUserId });
      if (error) throw error;
      // Existing clients subscribe to this per-user broadcast.
      const channel = client.channel(`admin-session-${targetUserId}`);
      await channel.send({ type: 'broadcast', event: 'force_logout', payload: { targetUserId } });
      await client.removeChannel(channel);
      return reply(200, { success: true, message: 'Sessions revoked' });
    }
    if (!auth.isOwner) return reply(403, { error: 'Owner access required' });
    if (action === 'list_users') {
      const { data, error } = await client.from('admin_users').select('user_id, email, display_name, role, totp_enabled, last_login');
      if (error) throw error;
      return reply(200, (data || []).map(u => ({ ...u, uid: u.user_id, id: u.user_id, twoFactorEnabled: u.totp_enabled, totpEnabled: u.totp_enabled, last_sign_in_at: u.last_login })));
    }
    if (action === 'toggle_2fa') {
      if (!targetUserId || typeof enable !== 'boolean') return reply(400, { error: 'User and desired 2FA state are required' });
      const { data: target, error } = await client.from('admin_users').select('totp_secret').eq('user_id', targetUserId).single();
      if (error) throw error;
      if (enable && !target.totp_secret) return reply(409, { error: 'This user must enroll an authenticator before 2FA can be enabled.' });
      const { error: updateError } = await client.from('admin_users').update({ totp_enabled: enable, ...(!enable ? { totp_secret:null } : {}) }).eq('user_id', targetUserId);
      if (updateError) throw updateError;
      return reply(200, { success: true, message: `2FA ${enable ? 'enabled' : 'disabled'}` });
    }
    return reply(400, { error: 'Unsupported action. Use the password recovery page for account recovery.' });
  } catch {
    return reply(500, { error: 'Unable to complete the security request. Please try again.' });
  }
};
