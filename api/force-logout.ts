import { createClient } from '@supabase/supabase-js';


export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-master-key, x-force-logout-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // 1. Security Check
  const secret = process.env.FORCE_LOGOUT_SECRET;
  const headerSecret = req.headers.get('x-force-logout-secret');
  const masterKey = req.headers.get('x-master-key');
  
  // Allow if secret matches OR if master key is provided (for UI integration)
  const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
  const isMaster = (masterKey === 'Raja@76023') || 
                   (masterKey === '9693') || 
                   (MASTER_KEY && masterKey === MASTER_KEY);
  const isAuthorized = (secret && secret === headerSecret) || isMaster;

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing secret/key' }), { status: 401, headers });
  }

  // 2. Initialize Supabase Admin Client
  // We use the REST API (via supabase-js) to avoid direct DB connection issues (port 5432/6543)
  const supabaseUrl = process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 3. Call the RPC function to clear sessions
    // This requires the 'force_logout_all_users' function to exist in the DB
    const { error } = await supabase.rpc('force_logout_all_users');

    if (error) {
      console.error('Supabase RPC Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Database Error', 
        details: error.message 
      }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ message: 'Successfully cleared all sessions via RPC' }), { status: 200, headers });

  } catch (err: any) {
    console.error('Unexpected Error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: err.message 
    }), { status: 500, headers });
  }
};

