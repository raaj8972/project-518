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

async function checkAllDataCounts() {
  const tables = [
    'events', 'event_categories', 'event_coordinators', 'schedule_days', 'schedule_events',
    'roadmap_milestones', 'event_winners', 'notifications',
    'sponsors', 'sponsorship_packages', 'gallery_images', 'faculty_heads',
    'core_team_members', 'sports_committees', 'sports_team_members', 'band_members', 'guest_artists'
  ];

  console.log('--- Row Counts ---');
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: ${error ? 'ERROR: ' + error.message : count}`);
  }
}

checkAllDataCounts();
