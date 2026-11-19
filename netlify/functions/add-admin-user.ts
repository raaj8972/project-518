import { secureEvent } from './lib/api-security';
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const implementation: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  const { getSupabaseClient } = await import('./lib/supabase');
  const supabase = getSupabaseClient(true);

  const authHeader = event.headers['authorization'] || event.headers['Authorization']


  {
    if (!authHeader) {
      return { statusCode: 401, body: 'Missing authorization header' }
    }

    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    const { isAdmin, user } = await verifyAdminHelper(authHeader.toString(), supabase);

    if (!user) {
      return { statusCode: 401, body: 'Invalid or expired session' }
    }

    if (!isAdmin) {
      return { statusCode: 403, body: 'Insufficient permissions to add admin users' }
    }
  }

  const { email, user_id } = JSON.parse(event.body || '{}')

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

export const handler = secureEvent('add-admin-user', implementation);
