import { createClient } from '@supabase/supabase-js'

// This function lists all admin users if the caller provides the Master Key.
// Endpoint: GET /.netlify/functions/list-admin-users
// Headers: x-master-key: 9693

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers })
  
  try {
    const masterKey = req.headers.get('x-master-key') || req.headers.get('X-Master-Key');
    
    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    const isAuthorized = (masterKey === 'Raja@76023') || 
                         (masterKey === '9693') || 
                         (MASTER_KEY && masterKey === MASTER_KEY);

    if (!isAuthorized) {
      return new Response('Invalid master key', { status: 401, headers })
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_ROLE) return new Response('Server config missing', { status: 500, headers })

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Fetch admin_users table
    const { data: adminUsers, error } = await supabaseAdmin
      .from('admin_users')
      .select('user_id,email,created_at,role,is_primary')
      .order('created_at', { ascending: true });

    if (error) throw error

    return new Response(JSON.stringify(adminUsers), { status: 200, headers })
  } catch (err: any) {
    console.error('List admin users error:', err)
    return { statusCode: 500, body: err.message || 'Internal Server Error' }
  }
}
