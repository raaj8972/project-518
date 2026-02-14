import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// This function lists all admin users if the caller provides the Master Key.
// Endpoint: GET /.netlify/functions/list-admin-users
// Headers: x-master-key: 9693

export default async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }
  
  try {
    const masterKey = event.headers['x-master-key'] || event.headers['X-Master-Key'];
    
    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    const isAuthorized = (masterKey === 'Raja@76023') || 
                         (masterKey === '9693') || 
                         (MASTER_KEY && masterKey === MASTER_KEY);

    if (!isAuthorized) {
      return { statusCode: 401, body: 'Invalid master key' }
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_ROLE) return { statusCode: 500, body: 'Server config missing' }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Fetch admin_users table
    const { data: adminUsers, error } = await supabaseAdmin
      .from('admin_users')
      .select('user_id,email,created_at,role,is_primary')
      .order('created_at', { ascending: true });

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify(adminUsers)
    }
  } catch (err: any) {
    console.error('List admin users error:', err)
    return { statusCode: 500, body: err.message || 'Internal Server Error' }
  }
}
