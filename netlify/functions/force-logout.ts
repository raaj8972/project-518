import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { secureEvent } from './lib/api-security';

const implementation: Handler = async () => {
  const { error } = await getSupabaseClient(true).rpc('force_logout_all_users');
  if (error) throw error;
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Successfully cleared all sessions via RPC' }) };
};
export const handler = secureEvent('force-logout', implementation);
