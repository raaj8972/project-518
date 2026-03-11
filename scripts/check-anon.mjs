import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- EVENTS (USING ANON KEY) ---');
  const { data: events, error: e1 } = await supabase.from('events').select('id, title').limit(5);
  console.log('Events (first 5):', events || e1?.message);

  console.log('\n--- EVENT CATEGORIES (USING ANON KEY) ---');
  const { data: cats, error: e2 } = await supabase.from('event_categories').select('id, name');
  console.log('Categories:', cats || e2?.message);

  console.log('\n--- SITE SETTINGS (USING ANON KEY) ---');
  const { data: settings, error: e3 } = await supabase.from('site_settings').select('*');
  console.log('Settings:', settings || e3?.message);
}

checkData();
