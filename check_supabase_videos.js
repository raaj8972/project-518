import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase.from('events').select('title, motion_poster_url').not('motion_poster_url', 'is', null);
    if (error) throw error;
    
    if (data.length === 0) {
      console.log("No motion_posters found in Supabase events table either.");
    } else {
      console.log("Found motion_posters in Supabase:");
      data.forEach(d => console.log(`- ${d.title}: ${d.motion_poster_url}`));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
