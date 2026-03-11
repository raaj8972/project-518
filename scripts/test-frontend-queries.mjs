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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFrontendQueries() {
  console.log('Testing queries as anon user...\n');

  console.log('1. events');
  const r1 = await supabase.from('events').select('*').order('display_order', { ascending: true }).limit(1);
  console.log('Result:', r1.error ? r1.error : 'OK');

  console.log('\n2. event_coordinators');
  const r2 = await supabase.from('event_coordinators').select('*').order('event_id', { ascending: true }).limit(1);
  console.log('Result:', r2.error ? r2.error : 'OK');

  console.log('\n3. event_categories');
  const r3 = await supabase.from('event_categories').select('*').limit(1);
  console.log('Result:', r3.error ? r3.error : 'OK');

  console.log('\n4. schedule_days & schedule_events');
  const r4 = await supabase.from('schedule_days').select('*, schedule_events (*)').order('date', { ascending: true }).limit(1);
  console.log('Result:', r4.error ? r4.error : 'OK');

  console.log('\n5. roadmap_milestones');
  const r5 = await supabase.from('roadmap_milestones').select('*').order('order_position', { ascending: true }).limit(1);
  console.log('Result:', r5.error ? r5.error : 'OK');

  console.log('\n6. rpc get_public_event_winners');
  const r6 = await supabase.rpc('get_public_event_winners');
  console.log('Result:', r6.error ? r6.error : 'OK');

  console.log('\n7. event_winners fallback');
  const r7 = await supabase.from('event_winners').select('*').limit(1);
  console.log('Result:', r7.error ? r7.error : 'OK');

  console.log('\n8. notifications');
  const r8 = await supabase.from('notifications').select('*').order('priority', { ascending: false }).limit(1);
  console.log('Result:', r8.error ? r8.error : 'OK');
}

testFrontendQueries();
