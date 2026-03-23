import { getSupabaseClient } from './lib/supabase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function diagnose() {
  const supabase = getSupabaseClient(true);
  
  console.log("--- Checking Admin Users ---");
  const { data: admins, error: adminError } = await supabase
    .from('admin_users')
    .select('*');

  if (adminError) console.error("Admin Users Error:", adminError.message);
  else console.log("Admins Count:", admins.length, admins);

  console.log("\n--- Checking Users Table (Target Emails) ---");
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .in('email', ['raja@rico.fun', 'raaj@rico.fun', 'raaj8972@gmail.com']);

  if (userError) console.error("Users Table Error:", userError.message);
  else console.log("Matching Users:", users);
  
  // Also try to check the schema of admin_users via a query that might fail but give us info
  console.log("\n--- Checking Table info ---");
  const { data: tableInfo, error: infoError } = await supabase.rpc('get_table_info', { tname: 'admin_users' });
  // If RPC doesn't exist, we'll just skip
  if (infoError) console.log("RPC get_table_info not found (expected)");
}

diagnose();
