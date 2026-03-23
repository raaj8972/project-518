import { getSupabaseClient } from './lib/supabase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function check() {
  const supabase = getSupabaseClient(true);
  
  console.log("Checking admin_users table structure...");
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching admin_users:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns found:", Object.keys(data[0]));
    console.log("Sample row:", data[0]);
  } else {
    console.log("Table is empty or not found.");
  }
}

check();
