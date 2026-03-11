import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) {
    console.error('Error fetching event:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('No events found, fetching PostgREST OpenAPI schema instead...');
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, { headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY }});
    const schema = await res.json();
    console.log(Object.keys(schema.definitions.events.properties).join(', '));
  }
}
check();
