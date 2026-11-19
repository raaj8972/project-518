import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { secureEvent } from './lib/api-security';

// Account directories require a current owner session; shared master headers are ignored.
const implementation: Handler = async () => {
  const { data, error } = await getSupabaseClient(true).from('admin_users')
    .select('user_id,email,created_at,role,is_primary').order('created_at', { ascending: true });
  if (error) throw error;
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || []) };
};
export const handler = secureEvent('list-admin-users', implementation);
