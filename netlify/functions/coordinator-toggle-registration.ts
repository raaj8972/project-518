import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

/**
 * Coordinator Registration Toggle
 * Validates coordinator token via get_coordinator_registrations RPC,
 * then toggles registration_open using service role (bypasses RLS).
 *
 * POST /.netlify/functions/coordinator-toggle-registration
 * Body: { event_id: number, token: string, registration_open: boolean }
 */
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

    const body = JSON.parse(event.body || '{}')
    const eventId = Number(body.event_id)
    const token = String(body.token || '')
    const registrationOpen = body.registration_open

    if (!eventId || !token || typeof registrationOpen !== 'boolean') {
      return { statusCode: 400, body: 'Missing required fields: event_id, token, registration_open' }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

    // Validate coordinator token — same RPC the dashboard uses for data fetching
    const { error: validationError } = await admin.rpc('get_coordinator_registrations', {
      event_id_param: eventId,
      token_param: token
    })

    if (validationError) {
      return { statusCode: 403, body: 'Invalid or expired coordinator token' }
    }

    // Token valid — update registration_open using service role (bypasses RLS)
    const { error: updateErr } = await admin
      .from('events')
      .update({ registration_open: registrationOpen })
      .eq('id', eventId)

    if (updateErr) {
      return { statusCode: 400, body: updateErr.message }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, registration_open: registrationOpen })
    }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
