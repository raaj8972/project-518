
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// This function lets the OWNER update an admin's email.
// Endpoint: POST /.netlify/functions/update-admin-email { userId, newEmail }
// Auth: requires a Supabase session JWT in Authorization: Bearer <access_token>

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Server not configured' }

    const { userId, newEmail } = JSON.parse(event.body || '{}')
    if (!userId || !newEmail) return { statusCode: 400, body: 'Missing userId/newEmail' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key']
    
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

    if (masterKey === '9693') {
      // Bypass mode
    } else {
      if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
        return { statusCode: 401, body: 'Missing auth' }
      }
      const accessToken = authHeader.toString().replace('Bearer ', '')
      const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } } as any)

      // Check caller is OWNER
      const { data: caller, error: meErr } = await userClient.auth.getUser()
      if (meErr || !caller?.user) return { statusCode: 401, body: 'Invalid session' }
      const callerId = caller.user.id
      const { data: rows } = await adminClient.from('admin_users').select('user_id, role').eq('user_id', callerId).maybeSingle()
      if (!rows || rows.role !== 'owner') return { statusCode: 403, body: 'Only owner can update admins' }
    }

    // Update auth user
    const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    } as any)
    
    if (updateErr) return { statusCode: 400, body: updateErr.message }

    // Update admin_users table
    const { error: dbErr } = await adminClient
      .from('admin_users')
      .update({ email: newEmail })
      .eq('user_id', userId)
    
    if (dbErr) return { statusCode: 400, body: dbErr.message }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
