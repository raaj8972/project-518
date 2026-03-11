import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) console.error("Error:", error);
  else if (data && data.length > 0) console.log("Columns:", Object.keys(data[0]).join(', '));
  else console.log("No data");
}
run();
