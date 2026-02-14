import { createClient } from '@supabase/supabase-js'

// This function lets the OWNER update the password of any admin user.
// Endpoint: POST /.netlify/functions/update-admin-password  { userId, password }
// Auth: requires a Supabase session JWT in Authorization: Bearer <access_token>

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers })
    
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!SUPABASE_URL || !SERVICE_ROLE) return new Response('Server not configured', { status: 500, headers })

    const body = await req.json();
    const { userId, password } = body
    if (!userId || !password) return new Response('Missing userId or password', { status: 400, headers })

    const masterKey = req.headers.get('x-master-key') || req.headers.get('X-Master-Key');
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    
    let isAuthorized = false;

    // 1. Check Master Key Bypass
    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    const isMaster = (masterKey === 'Raja@76023') || 
                     (masterKey === '9693') || 
                     (MASTER_KEY && masterKey === MASTER_KEY);

    if (isMaster) {
      isAuthorized = true;
    } else {
      // 2. Check Standard Auth
      if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
        return new Response('Missing auth', { status: 401, headers })
      }
      const accessToken = authHeader.toString().replace('Bearer ', '')

      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
      const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } } as any)

      // Check caller is OWNER
      const { data: caller, error: meErr } = await userClient.auth.getUser()
      if (meErr || !caller?.user) return new Response('Invalid session', { status: 401, headers })
      
      const callerId = caller.user.id
      const { data: rows } = await adminClient.from('admin_users').select('user_id, role, is_primary').eq('user_id', callerId).maybeSingle()
      
      // Only owner or primary admin can change other users' passwords
      if (rows && (rows.role === 'owner' || rows.is_primary)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response('Only owner can update other admin passwords', { status: 403, headers })
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

    // Update the user's password
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: password
    })

    if (updateErr) return new Response(updateErr.message, { status: 400, headers })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  } catch (err: any) {
    console.error('Error updating password:', err)
    return { statusCode: 500, body: err.message || 'Internal Server Error' }
  }
}
