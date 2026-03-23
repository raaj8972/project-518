import type { Handler } from '@netlify/functions';
import { supabase as adminClient } from './lib/supabase';
import { verifyAdmin } from './lib/auth-verify';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body || '{}');

    const { email, password, displayName, role = 'admin' } = body;

    if (!email || !password || !displayName) {
      return { statusCode: 400, body: 'Missing required fields: email, password, displayName' };
    }

    // 1. Authorize Caller (Must be Owner or Master Bypass)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key'];
    const envMasterKey = process.env.VITE_MASTER_BYPASS_KEY || process.env.MASTER_BYPASS_KEY;
    
    let isAuthorized = false;
    
    if (masterKey && masterKey === envMasterKey) {
      isAuthorized = true;
    } else if (authHeader) {
      const { isOwner } = await verifyAdmin(authHeader.toString(), adminClient);
      if (isOwner) isAuthorized = true;
    }

    if (!isAuthorized) {
      return { statusCode: 403, body: 'Forbidden: Only owners can create new admins.' };
    }

    // 2. Create Auth User in Supabase
    console.log('[create-admin] Creating auth user:', email);
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { role, display_name: displayName }
    });

    if (authErr || !authData.user) {
      console.error('[create-admin] Auth creation error:', authErr);
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: `Auth creation failed: ${authErr?.message}` }) 
      };
    }

    const userId = authData.user.id;
    const now = new Date().toISOString();

    // 3. Insert into Database directly using Service Role (bypasses RLS)
    console.log('[create-admin] Inserting admin_users record:', userId);
    const { error: dbErr1 } = await adminClient.from('admin_users').insert({
      id: userId,
      user_id: userId,
      email: email.trim().toLowerCase(),
      display_name: displayName,
      role: role,
      is_primary: role === 'owner',
      created_at: now,
      updated_at: now
    });
    
    if (dbErr1) {
      console.error('[create-admin] admin_users insert error:', dbErr1);
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: `Database insert failed: ${dbErr1.message}` }) 
      };
    }

    console.log('[create-admin] Inserting admin_permissions record:', userId);
    const { error: dbErr2 } = await adminClient.from('admin_permissions').insert({
      id: userId,
      user_id: userId,
      email: email.trim().toLowerCase(),
      updated_at: now
    });
    
    if (dbErr2) {
      console.warn('[create-admin] admin_permissions insert error (non-fatal):', dbErr2);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, user: { user_id: userId, email } })
    };

  } catch (err: any) {
    console.error('Error in create-admin:', err);
    return { statusCode: 500, body: err.message || 'Internal Server Error' };
  }
};
