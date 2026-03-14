import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// POST /.netlify/functions/grant-permissions  { email, flags? or all:true }
// Auth: Authorization: Bearer <supabase access token>
// Behavior: Owner-only. Finds admin_users row by email, then upserts admin_permissions.

type Flags = Partial<{
  can_events: boolean;
  can_schedule: boolean;
  can_gallery: boolean;
  can_sponsors: boolean;
  can_registrations: boolean;
  can_registration_photos: boolean;
  can_faculty: boolean;
  can_core_team: boolean;
  can_sports: boolean;
  can_guest_artists: boolean;
  can_chief_guests: boolean;
  can_homebound: boolean;
  can_security_passes: boolean;
}>;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Server not configured' }

    const { email, all, flags } = JSON.parse(event.body || '{}') as { email?: string; all?: boolean; flags?: Flags }
    if (!email) return { statusCode: 400, body: 'Missing email' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader) {
      return { statusCode: 401, body: 'Missing authorization header' }
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    const { isOwner, user } = await verifyAdminHelper(authHeader.toString(), adminClient);

    if (!user) {
      return { statusCode: 401, body: 'Invalid or expired session' }
    }

    if (!isOwner) {
      return { statusCode: 403, body: 'Only owners can grant permissions' }
    }

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
    const fullFlags: Flags = all
      ? {
          can_events: true,
          can_schedule: true,
          can_gallery: true,
          can_sponsors: true,
          can_registrations: true,
          can_registration_photos: true,
          can_faculty: true,
          can_core_team: true,
          can_sports: true,
          can_guest_artists: true,
          can_chief_guests: true,
          can_homebound: true,
          can_security_passes: true,
        }
      : { ...(flags || {}) }

    // Upsert into admin_permissions
    const insertRow = { user_id: targetUserId, ...fullFlags }
    const { error: upsertErr } = await adminClient
      .from('admin_permissions')
      .upsert(insertRow, { onConflict: 'user_id' })
    if (upsertErr) return { statusCode: 400, body: upsertErr.message }

    return { statusCode: 200, body: JSON.stringify({ ok: true, user_id: targetUserId, flags: fullFlags }) }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
