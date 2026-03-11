
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkAdminUsers() {
  console.log('--- Checking admin_users in Supabase ---');
  try {
    if (SUPABASE_URL && SERVICE_ROLE) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data, error } = await adminClient
        .from('admin_users')
        .select('*');
      
      if (error) console.error('Supabase Error:', error.message);
      else {
        console.log('Admin Users:', data.map(u => ({ email: u.email, role: u.role, user_id: u.user_id })));
        const council = data.find(u => u.email === 'sports.council@rico.family');
        if (council) console.log('Found Sports Council User:', council);
        else console.log('Sports Council User NOT FOUND in Supabase admin_users');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAdminUsers();
