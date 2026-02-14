import { createClient } from '@supabase/supabase-js'

// Fallback heartbeat function in case primary route is unavailable in prod
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
      console.error('Heartbeat-fallback env missing', missing)
      return new Response(JSON.stringify({ ok: false, error: 'Server not configured', missing }), {
        status: 500,
        headers,
      })
    }
    
    // Just return success for fallback check
    return new Response(JSON.stringify({ ok: true, fallback: true }), { status: 200, headers })
  } catch (e: any) {
    console.error('Heartbeat-fallback unexpected error', e)
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Internal error' }), { status: 500, headers })
  }
}
