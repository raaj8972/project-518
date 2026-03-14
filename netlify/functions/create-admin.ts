import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

// This function lets the OWNER create an auth user (email+password) and add them to admin_users.
// It uses the SUPABASE_SERVICE_ROLE key from Netlify environment variables (never expose on client).
// Endpoint: POST /.netlify/functions/create-admin  { email, password }
// Auth: requires a Supabase session JWT in Authorization: Bearer <access_token>

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    const { getSupabaseClient } = await import('./lib/supabase');
    const adminClient = getSupabaseClient(true);

    const { email, password } = JSON.parse(event.body || '{}')
    if (!email || !password) return { statusCode: 400, body: 'Missing email/password' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key']
    
    // Bypass for Master Admin (using same keys as add-admin-user.ts)
    const MASTER_KEY_ENV = process.env.MASTER_BYPASS_KEY;
    const isMasterBypass = (masterKey === process.env.MASTER_BYPASS_KEY) || 
                           (masterKey === process.env.MASTER_BYPASS_KEY) || 
                           (MASTER_KEY_ENV && masterKey === MASTER_KEY_ENV);

    if (isMasterBypass) {
        // Skip auth check if master key is valid
    } else {
        if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
          return { statusCode: 401, body: 'Missing auth' }
        }
        const accessToken = authHeader.toString().replace('Bearer ', '')
    
        // Check caller is OWNER
        const { data: caller, error: meErr } = await adminClient.auth.getUser(accessToken)
        if (meErr || !caller?.user) return { statusCode: 401, body: 'Invalid session' }
        const callerId = caller.user.id
        const { data: rows } = await adminClient.from('admin_users').select('user_id, role').eq('user_id', callerId).maybeSingle()
        if (!rows || !['owner', 'admin'].includes(rows.role)) {
          return { statusCode: 403, body: 'Insufficient permissions to create admins' }
        }
    }

    // Create auth user
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    } as any)
    if (createErr) return { statusCode: 400, body: createErr.message }
    const newUserId = (created?.user as any)?.id
    if (!newUserId) return { statusCode: 500, body: 'Failed to create user' }

    // Insert admin as regular admin via service role (bypass RLS)
    const { error: insErr } = await adminClient.from('admin_users').insert({ user_id: newUserId, email, role: 'admin' })
    if (insErr) return { statusCode: 400, body: insErr.message }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, user_id: newUserId, email })
    }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
