const { createClient } = require('@supabase/supabase-js')

// POST /.netlify/functions/grant-permissions  { email, flags? or all:true }
// Auth: Authorization: Bearer <supabase access token>
// Behavior: Owner-only. Finds admin_users row by email, then upserts admin_permissions.

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
    if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Server not configured' }

    const { email, all, flags } = JSON.parse(event.body || '{}')
    if (!email) return { statusCode: 400, body: 'Missing email' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Missing auth' }
    }
    const accessToken = authHeader.toString().replace('Bearer ', '')

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } })

    // Check caller is OWNER
    const { data: caller, error: meErr } = await userClient.auth.getUser()
    if (meErr || !caller?.user) return { statusCode: 401, body: 'Invalid session' }
    const callerId = caller.user.id
    const { data: ownerRow, error: ownerErr } = await adminClient
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', callerId)
      .maybeSingle()
    if (ownerErr) return { statusCode: 400, body: ownerErr.message }
    if (!ownerRow || ownerRow.role !== 'owner') return { statusCode: 403, body: 'Only owner can grant permissions' }

    // Find admin user by email in admin_users
    const { data: adminRow, error: findErr } = await adminClient
      .from('admin_users')
      .select('user_id, email, role')
      .ilike('email', email)
      .maybeSingle()
    if (findErr) return { statusCode: 400, body: findErr.message }
    if (!adminRow?.user_id) return { statusCode: 400, body: 'Admin user not found. Add admin first.' }

    const targetUserId = adminRow.user_id

    // Construct flags: if all==true, set all to true; else take provided flags
    const fullFlags = all
      ? {
          can_events: true,
          can_schedule: true,
          can_gallery: true,
          can_sponsors: true,
          can_registrations: true,
          can_registration_photos: true,
          can_faculty: true,
          can_core_team: true,
          can_guest_artists: true,
          can_chief_guests: true,
          can_homebound: true,
        }
      : { ...(flags || {}) }

    // Upsert into admin_permissions
    const insertRow = { user_id: targetUserId, ...fullFlags }
    const { error: upsertErr } = await adminClient
      .from('admin_permissions')
      .upsert(insertRow, { onConflict: 'user_id' })
    if (upsertErr) return { statusCode: 400, body: upsertErr.message }

    return { statusCode: 200, body: JSON.stringify({ ok: true, user_id: targetUserId, flags: fullFlags }) }
  } catch (e) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
