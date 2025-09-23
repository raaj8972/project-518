import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Securely upsert the singleton form_settings row (id=1) using the service role.
// Authorization: Requires a valid Supabase user session token and that the user
// exists in admin_permissions (any row). You may tighten the check to specific
// capability flags if desired (e.g., can_homebound or can_registrations).
//
// Endpoint: POST /.netlify/functions/update-form-settings
// Body: { audition_form_enabled?, audition_form_message?, membership_form_enabled?, membership_form_message? }
export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, body: 'Server not configured' }
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Missing auth' }
    }
    const accessToken = authHeader.toString().replace('Bearer ', '')

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } } as any)

    // Validate caller session
    const { data: caller, error: meErr } = await userClient.auth.getUser()
    if (meErr || !caller?.user) return { statusCode: 401, body: 'Invalid session' }
    const callerId = caller.user.id

    // Authorization: user must be an admin. Prefer admin_permissions, fallback to admin_users
    let authorized = false
    try {
      const { data: apRow } = await adminClient
        .from('admin_permissions' as any)
        .select('user_id')
        .eq('user_id', callerId)
        .maybeSingle()
      if (apRow?.user_id) authorized = true
    } catch {}
    if (!authorized) {
      try {
        const { data: auRow } = await adminClient
          .from('admin_users' as any)
          .select('user_id, role')
          .eq('user_id', callerId)
          .maybeSingle()
        if (auRow?.user_id && ['owner','admin'].includes((auRow as any).role)) authorized = true
      } catch {}
    }
    if (!authorized) return { statusCode: 403, body: 'Forbidden' }

    // Parse and whitelist fields
    const body = JSON.parse(event.body || '{}')
    const payload: any = { id: 1 }
    const allowedKeys = new Set([
      'audition_form_enabled',
      'audition_form_message',
      'membership_form_enabled',
      'membership_form_message',
    ])
    for (const [k, v] of Object.entries(body)) {
      if (allowedKeys.has(k)) payload[k] = v
    }

    // Nothing to update
    const keysToUpdate = Object.keys(payload).filter(k => k !== 'id')
    if (keysToUpdate.length === 0) {
      return { statusCode: 400, body: 'No valid fields to update' }
    }

    // Upsert using service role to bypass RLS safely
    const { error: upsertErr } = await adminClient
      .from('form_settings' as any)
      .upsert(payload, { onConflict: 'id' })

    if (upsertErr) return { statusCode: 400, body: upsertErr.message }

    // Return the saved row for convenience
    const { data: row, error: selErr } = await adminClient
      .from('form_settings' as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (selErr) return { statusCode: 200, body: JSON.stringify({ ok: true }) }

    return { statusCode: 200, body: JSON.stringify({ ok: true, form_settings: row }) }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
