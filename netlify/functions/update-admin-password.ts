import type { Handler } from '@netlify/functions';
import { supabase as adminClient } from './lib/supabase';
import { verifyAdmin } from './lib/auth-verify';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { userId, password } = JSON.parse(event.body || '{}');

    if (!userId || !password) return { statusCode: 400, body: 'Missing userId or password' };

    // 1. Authorize Caller
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key'];
    const envMasterKey = process.env.VITE_MASTER_BYPASS_KEY || process.env.MASTER_BYPASS_KEY;
    
    let isAuthorized = false;

    if (masterKey && masterKey === envMasterKey) {
      isAuthorized = true;
    } else if (authHeader) {
      const { isOwner, user } = await verifyAdmin(authHeader.toString(), adminClient);
      
      // Crucial Authorization Logic:
      // Owners can change ANY password. Admins can ONLY change their OWN password.
      if (isOwner) {
        isAuthorized = true;
      } else if (user && user.id === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return { statusCode: 403, body: 'Forbidden: You are not authorized to change this password.' };
    }

    let targetUserId = userId;

    if (userId === 'PRIMARY_OWNER') {
      const { data: owners, error: ownerErr } = await adminClient
        .from('admin_users')
        .select('user_id')
        .eq('role', 'owner')
        .limit(1);
      
      if (ownerErr) {
        return { statusCode: 500, body: 'Error resolving primary owner lookup' };
      }

      if (owners && owners.length > 0) {
        targetUserId = owners[0].user_id;
      } else {
        return { statusCode: 404, body: 'Primary owner not found in database' };
      }
    }

    // 2. Update Password via Service Role
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: password
    });

    if (updateErr) {
      return { statusCode: 400, body: updateErr.message };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Password updated successfully' })
    };

  } catch (err: any) {
    console.error('Error updating password:', err);
    return { statusCode: 500, body: err.message || 'Internal Server Error' };
  }
};
