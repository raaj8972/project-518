import { getSupabaseClient } from './lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Standard dotenv loading, handles local and deployed environments without import.meta.url
dotenv.config();
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../../.env.local' });

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
