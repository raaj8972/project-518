import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { userId } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };

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
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
