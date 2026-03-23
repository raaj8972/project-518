
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) {
    console.error('Error fetching event schema:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in events table:', Object.keys(data[0]));
    console.log('Example event data:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No events found to inspect schema.');
  }
}

inspectSchema();
