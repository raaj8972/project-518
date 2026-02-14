import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers });

  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch passkeys for this user
    const { data: passkeys, error } = await supabase
      .from('passkeys')
      .select('id, credential_id, created_at, last_used_at, transports')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ passkeys }),
    };
  } catch (error: any) {
    console.error('List passkeys error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
