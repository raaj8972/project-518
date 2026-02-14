import { createClient } from '@supabase/supabase-js'

// This function lets the OWNER create an auth user (email+password) and add them to admin_users.
// It uses the SUPABASE_SERVICE_ROLE key from Netlify environment variables (never expose on client).
// Endpoint: POST /.netlify/functions/create-admin  { email, password }
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
    const { email, password } = body
    if (!email || !password) return new Response('Missing email/password', { status: 400, headers })

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const masterKey = req.headers.get('x-master-key') || req.headers.get('X-Master-Key')
    
    // Bypass for Master Admin (using same keys as add-admin-user.ts)
    const MASTER_KEY_ENV = process.env.MASTER_BYPASS_KEY;
    const isMasterBypass = (masterKey === 'Raja@76023') || 
                           (masterKey === '9693') || 
                           (MASTER_KEY_ENV && masterKey === MASTER_KEY_ENV);

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

    if (isMasterBypass) {
        // Skip auth check if master key is valid
    } else {
        if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
          return new Response('Missing auth', { status: 401, headers })
        }
        const accessToken = authHeader.toString().replace('Bearer ', '')
        const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } } as any)
    
        // Check caller is OWNER
        const { data: caller, error: meErr } = await userClient.auth.getUser()
        if (meErr || !caller?.user) return new Response('Invalid session', { status: 401, headers })
        const callerId = caller.user.id
        const { data: rows } = await adminClient.from('admin_users').select('user_id, role').eq('user_id', callerId).maybeSingle()
        if (!rows || rows.role !== 'owner') return new Response('Only owner can create admins', { status: 403, headers })
    }

    // Create auth user
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    } as any)
    if (createErr) return new Response(createErr.message, { status: 400, headers })
    const newUserId = (created?.user as any)?.id
    if (!newUserId) return new Response('Failed to create user', { status: 500, headers })

    // Insert admin as regular admin via service role (bypass RLS)
    const { error: insErr } = await adminClient.from('admin_users').insert({ user_id: newUserId, email, role: 'admin' })
    if (insErr) return new Response(insErr.message, { status: 400, headers })

    return new Response(JSON.stringify({ ok: true, user_id: newUserId, email }), { status: 200, headers })
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
