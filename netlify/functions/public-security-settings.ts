import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';

// Explicit allowlist: staff passwords and any future private columns never leave the server.
export const PUBLIC_SECURITY_FIELDS = ['id', 'councils_enabled', 'entry_pass_button_enabled', 'event_dates', 'pass_template_config', 'updated_at', 'venue', 'panic_mode_enabled'] as const;
export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Method not allowed' });
  try {
    const { data, error } = await getSupabaseClient(true).from('security_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return reply(200, data ? Object.fromEntries(PUBLIC_SECURITY_FIELDS.filter(key => key in data).map(key => [key, data[key]])) : null);
  } catch {
    return reply(503, { error: 'Public settings temporarily unavailable' });
  }
};
