import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// On-demand heartbeat: upserts last_run = now() into health_heartbeats (id=1)
export const handler: Handler = async () => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Server not configured' }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats' as any)
      .upsert({ id: 1, last_run: new Date().toISOString(), updated_by: 'netlify-func:heartbeat' } as any, { onConflict: 'id' })
    if (error) return { statusCode: 500, body: error.message }

    const { data, error: selErr } = await admin.from('health_heartbeats' as any).select('*').eq('id', 1).maybeSingle()
    if (selErr) return { statusCode: 500, body: selErr.message }
    return { statusCode: 200, body: JSON.stringify({ ok: true, row: data }) }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Internal error' }
  }
}
