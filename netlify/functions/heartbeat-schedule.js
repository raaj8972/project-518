import { createClient } from '@supabase/supabase-js'

export const handler = async () => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      const missing = {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_or_KEY: Boolean(SERVICE_ROLE),
      }
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Server not configured', missing }) }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { error } = await admin
      .from('health_heartbeats')
      .upsert({ id: 1, last_run: new Date().toISOString(), updated_by: 'netlify-cron:heartbeat' }, { onConflict: 'id' })
    if (error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
    return { statusCode: 200, body: JSON.stringify({ ok: true, updated: true }) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Internal error' }) }
  }
}

export default handler
