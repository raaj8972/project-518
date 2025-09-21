import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// This function lets the OWNER create an auth user (email+password) and add them to admin_users.
// It uses the SUPABASE_SERVICE_ROLE key from Netlify environment variables (never expose on client).
// Endpoint: POST /.netlify/functions/create-admin  { email, password }
// Auth: requires a Supabase session JWT in Authorization: Bearer <access_token>

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Server not configured' }

    const { email, password } = JSON.parse(event.body || '{}')
    if (!email || !password) return { statusCode: 400, body: 'Missing email/password' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Missing auth' }
    }
    const accessToken = authHeader.toString().replace('Bearer ', '')

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } } as any)

    // Check caller is OWNER
    const { data: caller, error: meErr } = await userClient.auth.getUser()
    if (meErr || !caller?.user) return { statusCode: 401, body: 'Invalid session' }
    const callerId = caller.user.id
    const { data: rows } = await adminClient.from('admin_users').select('user_id, role').eq('user_id', callerId).maybeSingle()
    if (!rows || rows.role !== 'owner') return { statusCode: 403, body: 'Only owner can create admins' }

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
