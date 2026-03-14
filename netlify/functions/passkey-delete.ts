import { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing authorization header' }) };
    }

    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');

    const { isAdmin, isOwner, user: authUser } = await verifyAdminHelper(authHeader.toString(), supabase);
    if (!isAdmin || !authUser) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or unauthorized session' }) };
    }

    const { passkeyId, userId, credentialId } = JSON.parse(event.body || '{}');
    const targetUserId = userId || authUser.id;
    const targetPasskeyId = passkeyId || credentialId;

    if (!targetPasskeyId || !targetUserId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing passkey identifier or userId' }) };
    }

    console.log(`[Passkey Delete] Request for passkey: ${targetPasskeyId} for user: ${targetUserId} by authUser: ${authUser.id}`);

    // Security check: Only allow users to delete their own passkeys, unless they are an owner
    const isSelf = authUser.id === targetUserId;
    
    if (!isSelf && !isOwner) {
        console.warn(`[Passkey Delete] Forbidden access attempt by ${authUser.id} for ${targetUserId}`);
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Access denied' }) };
    }

    // Delete the passkey (with user_id check for security)
    const { error } = await supabase
      .from('passkeys')
      .delete()
      .eq('id', targetPasskeyId)
      .eq('user_id', targetUserId);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Delete passkey error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
