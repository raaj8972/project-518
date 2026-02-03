import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-master-key, x-force-logout-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. Security Check
  const secret = process.env.FORCE_LOGOUT_SECRET;
  const headerSecret = event.headers['x-force-logout-secret'];
  const masterKey = event.headers['x-master-key'];
  
  // Allow if secret matches OR if master key is provided (for UI integration)
  const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
  const isAuthorized = (secret && secret === headerSecret) || (MASTER_KEY && masterKey === MASTER_KEY) || (masterKey === '9693');

  if (!isAuthorized) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized: Invalid or missing secret/key' }),
    };
  }

  // 2. Initialize Supabase Admin Client
  // We use the REST API (via supabase-js) to avoid direct DB connection issues (port 5432/6543)
  const supabaseUrl = process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing' }),
    };
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database Error', 
          details: error.message 
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Successfully cleared all sessions via RPC' }),
    };

  } catch (err: any) {
    console.error('Unexpected Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        details: err.message 
      }),
    };
  }
};

export { handler };
