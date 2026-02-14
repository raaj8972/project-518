import { createClient } from '@supabase/supabase-js'

// Scheduled heartbeat: configure in vercel.json crons
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
      console.error('Heartbeat-schedule env missing', missing)
      return new Response(JSON.stringify({ ok: false, error: 'Server not configured', missing }), {
        status: 500,
        headers,
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats' as any)
      .upsert({ id: 1, last_run: new Date().toISOString(), updated_by: 'vercel-cron:heartbeat' } as any, { onConflict: 'id' })
    if (error) {
      console.error('Heartbeat-schedule upsert error', error)
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers })
    }
    return new Response(JSON.stringify({ ok: true, updated: true }), { status: 200, headers })
  } catch (e: any) {
    console.error('Heartbeat-schedule unexpected error', e)
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Internal error' }), { status: 500, headers })
  }
}
