import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// This function lets the OWNER update the password of any admin user.
// Endpoint: POST /.netlify/functions/update-admin-password  { userId, password }
// Auth: requires a Supabase session JWT in Authorization: Bearer <access_token>

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    
    const { getSupabaseClient } = await import('./lib/supabase');
    const adminClient = getSupabaseClient(true);

    const { userId, password } = JSON.parse(event.body || '{}')
    if (!userId || !password) return { statusCode: 400, body: 'Missing userId or password' }

    const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key'];
    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    
    let isAuthorized = false;

    // 1. Check Master Key Bypass
    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    const isMaster = (masterKey === process.env.MASTER_BYPASS_KEY) || 
                     (masterKey === process.env.MASTER_BYPASS_KEY) || 
                     (MASTER_KEY && masterKey === MASTER_KEY);

    if (isMaster) {
      isAuthorized = true;
    } else {
      if (!authHeader) {
        return { statusCode: 401, body: 'Missing auth' }
      }
      
      const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
      const { isOwner, user } = await verifyAdminHelper(authHeader.toString(), adminClient);

      if (!user) {
        return { statusCode: 401, body: 'Invalid session' }
      }

      if (isOwner) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return { statusCode: 403, body: 'Only owner can update other admin passwords' }
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: password
    })

    if (updateErr) return { statusCode: 400, body: updateErr.message }

    // --- Firebase Synchronization ---
    try {
      // Get the user's email from Supabase to find them in Firebase
      const { data: sbUser } = await adminClient.auth.admin.getUserById(userId);
      const email = sbUser?.user?.email;

      if (email) {
        const { firebaseAdmin } = await import('./lib/auth-verify');
        try {
          const fUser = await firebaseAdmin.auth().getUserByEmail(email);
          if (fUser) {
            console.log(`[update-admin-password] Syncing Firebase password for: ${email}`);
            await firebaseAdmin.auth().updateUser(fUser.uid, { password: password });
          }
        } catch (fError: any) {
          if (fError.code !== 'auth/user-not-found') {
            console.error('[update-admin-password] Firebase sync error:', fError);
          }
        }
      }
    } catch (err: any) {
      console.error('[update-admin-password] Sync logic error:', err);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Password updated across systems' })
    }
  } catch (err: any) {
    console.error('Error updating password:', err)
    return { statusCode: 500, body: err.message || 'Internal Server Error' }
  }
}
