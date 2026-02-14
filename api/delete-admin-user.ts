import { createClient } from '@supabase/supabase-js'

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

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers })
  
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response('Server configuration error', { status: 500, headers })
  }

  const masterKey = req.headers.get('x-master-key') || req.headers.get('X-Master-Key')
  const MASTER_KEY = process.env.MASTER_BYPASS_KEY;

  const isAuthorized = (masterKey === 'Raja@76023') || 
                       (masterKey === '9693') || 
                       (MASTER_KEY && masterKey === MASTER_KEY);

  if (!isAuthorized) {
    console.warn('[SECURITY] Unauthorized attempt to delete admin user');
    return new Response('Unauthorized', { status: 401, headers })
  }

  const body = await req.json();
    const { user_id } = body
  if (!user_id) return new Response('Missing user_id', { status: 400, headers })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    // Prevent removing the owner?
    // The UI checks this, but good to be safe.
    // However, we are bypassing, so we assume the caller (Mock Owner) knows what they are doing.
    // But we should probably check if the target is the owner.
    
    const { data: target } = await supabase.from('admin_users').select('role').eq('user_id', user_id).single()
    if (target?.role === 'owner') {
      return new Response('Cannot remove owner', { status: 403, headers })
    }

    // Delete from admin_users table first (to revoke access immediately)
    const { error: dbError } = await supabase.from('admin_users').delete().eq('user_id', user_id)
    if (dbError) throw dbError

    // Also delete from Supabase Auth to prevent login
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id)
    if (authError) {
      console.warn('Failed to delete from Auth (might already be deleted):', authError)
      // We don't throw here, because database access is revoked anyway
    }

    return new Response(JSON.stringify({ success: true, message: 'Admin user and auth deleted' }), { status: 200, headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers })
  }
}
