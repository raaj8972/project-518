import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { passkeyId, userId } = JSON.parse(event.body || '{}');
    if (!passkeyId || !userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing passkeyId or userId' }) };

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Delete the passkey (with user_id check for security)
    const { error } = await supabase
      .from('passkeys')
      .delete()
      .eq('id', passkeyId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Delete passkey error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
