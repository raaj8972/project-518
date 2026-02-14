import { createClient } from '@supabase/supabase-js'

// On-demand heartbeat: upserts last_run = now() into health_heartbeats (id=1)
export default async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      const missing = {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_or_KEY: Boolean(SERVICE_ROLE),
      }
      console.error('Heartbeat env missing', missing)
      return new Response(JSON.stringify({ ok: false, error: 'Server not configured', missing }), {
        status: 500,
        headers,
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats')
      .upsert({ id: 1, last_run: new Date().toISOString() }, { onConflict: 'id' })
    if (error) {
      console.error('Heartbeat upsert error', error)
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (e: any) {
    console.error('Heartbeat unexpected error', e)
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Internal error' }), { status: 500, headers })
  }
}
