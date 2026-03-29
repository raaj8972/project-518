import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL is available:", !!url);

try {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('admin_users').select('*').limit(1);

  if (error) {
    console.error("❌ Connection failed or Query Error:", error.message);
  } else {
    console.log("✅ Connection SUCCESSFUL! Local environment can read data.");
    console.log(`📦 Data fetched from admin_users ok! Data size: ${data.length}`);
  }
} catch(err) {
  console.log("Crash:", err)
}

process.exit(0);
