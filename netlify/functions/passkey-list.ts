import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing authorization header' }) };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');

    const { isAdmin, isOwner, user: authUser } = await verifyAdminHelper(authHeader.toString(), supabase);
    if (!isAdmin || !authUser) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or unauthorized session' }) };
    }

    const { userId } = JSON.parse(event.body || '{}');
    if (!userId) {
      console.error('[Passkey List] Missing userId in request body');
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    console.log(`[Passkey List] Request for userId: ${userId} by authUser: ${authUser.id}`);

    // Security check: Only allow users to list their own passkeys, unless they are an owner
    const isSelf = authUser.id === userId;
    
    if (!isSelf && !isOwner) {
        console.warn(`[Passkey List] Forbidden access attempt by ${authUser.id} for ${userId}`);
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Access denied' }) };
    }

    // Fetch passkeys for this user
    console.log(`[Passkey List] Querying passkeys for user_id: ${userId}`);
    const { data: passkeys, error } = await supabase
      .from('passkeys')
      .select('id, credential_id, created_at, last_used_at, transports')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Passkey List] Database error:', error);
      throw error;
    }

    console.log(`[Passkey List] Found ${passkeys?.length || 0} passkeys`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        passkeys,
        debug: {
          requestedUserId: userId,
          authUserId: authUser.id,
          isOwner,
          isAdmin,
          count: passkeys?.length || 0
        }
      }),
    };
  } catch (error: any) {
    console.error('List passkeys error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
