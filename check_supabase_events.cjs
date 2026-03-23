
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) {
    console.error('Error fetching events:', error);
  } else {
    console.log(`Found ${data.length} recent events in Supabase:`);
    data.forEach(e => {
      console.log(`- ID: ${e.id}, Title: ${e.title}, Visible: ${e.visible}, Created: ${e.created_at}, Image: ${e.image_url || e.image}`);
    });
  }
}

checkEvents();
