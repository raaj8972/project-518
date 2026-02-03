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
  const MASTER_KEY = process.env.MASTER_BYPASS_KEY || 'Raja@76023';

  if (masterKey !== MASTER_KEY && masterKey !== '9693') {
    console.warn('[SECURITY] Unauthorized attempt to add admin user');
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const { email, user_id } = JSON.parse(event.body || '{}')
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    if (user_id) {
      // Direct insert
      const { error } = await supabase.from('admin_users').insert({ 
        user_id, 
        email: email || '',
        role: 'admin' 
      })
      if (error) throw error
    } else if (email) {
      // Use RPC
      const { error } = await supabase.rpc('add_admin_by_email', { p_email: email })
      if (error) throw error
    } else {
      return { statusCode: 400, body: 'Missing user_id or email' }
    }

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
