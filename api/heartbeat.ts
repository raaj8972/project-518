import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// On-demand heartbeat: upserts last_run = now() into health_heartbeats (id=1)
export default = async () => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      const missing = {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_or_KEY: Boolean(SERVICE_ROLE),
      }
      console.error('Heartbeat env missing', missing)
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Server not configured', missing }),
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats' as any)
      .upsert({ id: 1, last_run: new Date().toISOString(), updated_by: 'netlify-func:heartbeat' } as any, { onConflict: 'id' })
    if (error) {
      console.error('Heartbeat upsert error', error)
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
    }

    const { data, error: selErr } = await admin.from('health_heartbeats' as any).select('*').eq('id', 1).maybeSingle()
    if (selErr) {
      console.error('Heartbeat select error', selErr)
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: selErr.message }) }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, row: data }) }
  } catch (e: any) {
    console.error('Heartbeat unexpected error', e)
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Internal error' }) }
  }
}
