import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler = async (event: any, context: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    return { statusCode: 500, body: 'Server Configuration Error' };
  }

  try {
    const { eventId } = JSON.parse(event.body || '{}');

    if (!eventId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing eventId' }) };
    }

    // Initialize Supabase with Service Role Key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[get-event-candidates] Fetching for EventID: ${eventId} (Type: ${typeof eventId})`);

    // Fetch candidates
    const { data, error, count } = await supabase
      .from('registrations')
      .select('id, full_name, team_name, participant_type, status', { count: 'exact' })
      .eq('event_id', eventId)
      .is('deleted_at', null);

    if (error) {
      console.error('[get-event-candidates] DB Error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    console.log(`[get-event-candidates] Success. Found ${data?.length} records. Total count: ${count}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || []),
    };

  } catch (error) {
    console.error('Handler error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
