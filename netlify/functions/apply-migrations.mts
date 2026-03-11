import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  // Simple auth check via header to prevent public abuse
  const authHeader = event.headers.authorization;
  if (authHeader !== `Bearer ${process.env.VITE_COUNCIL_PASSCODE || '1234'}`) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  // MUST use Service Role Key to bypass RLS and execute schema changes securely
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Note: Supabase JS client cannot execute raw DDL (CREATE/ALTER) directly unless
    // a custom RPC function exists, or we use a standard Postgres client.
    // However, since we don't have SUPABASE_DB_URL, we'll guide the user to the SQL editor.
    // Let me try calling an arbitrary RPC just to see if any helper exists.
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
    
    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "RPC executed successfully.", data })
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Cannot run raw SQL via API without a pre-existing RPC function. You MUST use the Supabase Dashboard SQL Editor.', details: error.message })
    };
  }
};
