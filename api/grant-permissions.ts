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

    const body = await req.json()
    const { email, all, flags } = body as { email?: string; all?: boolean; flags?: Flags }
    
    if (!email) return new Response('Missing email', { status: 400, headers })

    const authHeader = req.headers.get('authorization')
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
    const { data: ownerRow, error: ownerErr } = await adminClient
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', callerId)
      .maybeSingle()
    if (ownerErr) return new Response(ownerErr.message, { status: 400, headers })
    if (!ownerRow || ownerRow.role !== 'owner') return new Response('Only owner can grant permissions', { status: 403, headers })

    // Find admin user by email in admin_users
    const { data: adminRow, error: findErr } = await adminClient
      .from('admin_users')
      .select('user_id, email, role')
      .ilike('email', email)
      .maybeSingle()
    if (findErr) return new Response(findErr.message, { status: 400, headers })
    if (!adminRow?.user_id) return new Response('Admin user not found. Add admin first.', { status: 400, headers })

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
    if (upsertErr) return new Response(upsertErr.message, { status: 400, headers })

    return new Response(JSON.stringify({ ok: true, user_id: targetUserId, flags: fullFlags }), { status: 200, headers })
  } catch (e: any) {
    return new Response(e?.message || 'Internal error', { status: 500, headers })
  }
}
