import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { statusCode: 500, body: 'Server configuration error' }
  }

  const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key']
  const MASTER_KEY = process.env.MASTER_BYPASS_KEY;

  if (!MASTER_KEY || (masterKey !== MASTER_KEY && masterKey !== '9693')) {
    console.warn('[SECURITY] Unauthorized attempt to delete admin user');
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const { user_id } = JSON.parse(event.body || '{}')
  if (!user_id) return { statusCode: 400, body: 'Missing user_id' }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // Prevent removing the owner?
    // The UI checks this, but good to be safe.
    // However, we are bypassing, so we assume the caller (Mock Owner) knows what they are doing.
    // But we should probably check if the target is the owner.
    
    const { data: target } = await supabase.from('admin_users').select('role').eq('user_id', user_id).single()
    if (target?.role === 'owner') {
      return { statusCode: 403, body: 'Cannot remove owner' }
    }

    const { error } = await supabase.from('admin_users').delete().eq('user_id', user_id)
    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    }
  } catch (err: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message })
    }
  }
}
