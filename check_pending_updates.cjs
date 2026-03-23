
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPending() {
  const { data, error } = await supabase.from('pending_updates').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) {
    console.error('Error fetching pending updates:', error);
  } else {
    console.log(`Found ${data.length} pending updates in Supabase:`);
    data.forEach(p => {
      console.log(`- ID: ${p.id}, Table: ${p.table_name}, Operation: ${p.operation}, Created: ${p.created_at}`);
      try {
        const payload = typeof p.payload === 'string' ? JSON.parse(p.payload) : p.payload;
        console.log(`  Payload Title: ${payload.title}`);
      } catch (e) {
        console.log(`  Payload: [unparseable]`);
      }
    });
  }
}

checkPending();
