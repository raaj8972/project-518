import { createClient } from '@supabase/supabase-js'

// Fallback heartbeat function in case primary route is unavailable in prod
export default async () => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      const missing = {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_or_KEY: Boolean(SERVICE_ROLE),
      }
      return new Response(JSON.stringify({ ok: false, error: 'Server not configured', missing }), { status: 500, headers })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats' as any)
      .upsert({ id: 1, last_run: new Date().toISOString(), updated_by: 'netlify-func:heartbeat-fallback' } as any, { onConflict: 'id' })
    if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers })

    const { data, error: selErr } = await admin.from('health_heartbeats' as any).select('*').eq('id', 1).maybeSingle()
    if (selErr) return new Response(JSON.stringify({ ok: false, error: selErr.message }), { status: 500, headers })
    return new Response(JSON.stringify({ ok: true, row: data }), { status: 200, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Internal error' }), { status: 500, headers })
  }
}
