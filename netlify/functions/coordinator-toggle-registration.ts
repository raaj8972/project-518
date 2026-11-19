import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { verifyToken } from './lib/auth-verify';
import { secureEvent } from './lib/api-security';
const implementation: Handler = async event => {
  const client = getSupabaseClient(true);
  const user = await verifyToken(event.headers?.authorization || event.headers?.Authorization, client);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Sign in required' }) };
  let body; try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: '{}' }; }
  const eventId = String(body.event_id || '');
  if (typeof body.registration_open !== 'boolean' || !eventId || eventId.length > 200) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid event settings' }) };
  if (user.app_metadata?.role !== 'coordinator' || user.app_metadata?.coordinator_event_id !== eventId) return { statusCode: 403, body: JSON.stringify({ error: 'Coordinator access required for this event' }) };
  const { error } = await client.from('events').update({ registration_open: body.registration_open }).eq('id', eventId);
  if (error) throw error;
  return { statusCode: 200, body: JSON.stringify({ ok: true, registration_open: body.registration_open }) };
};
export const handler = secureEvent('coordinator-toggle-registration', implementation);
