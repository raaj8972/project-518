import { createClient } from '@supabase/supabase-js'

// Scheduled heartbeat: configure in netlify.toml [[scheduled]]
export default async () => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      const missing = {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_or_KEY: Boolean(SERVICE_ROLE),
      }
      console.error('Heartbeat-schedule env missing', missing)
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Server not configured', missing }),
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats' as any)
      .upsert({ id: 1, last_run: new Date().toISOString(), updated_by: 'netlify-cron:heartbeat' } as any, { onConflict: 'id' })
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

// Declare schedule inline as well (Netlify picks either inline or netlify.toml)
export const config: Config = {
  schedule: '*/15 * * * *',
}
