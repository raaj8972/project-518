import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllPossibleTables() {
  const tables = [
    'site_settings', 'about_settings', 'homebound_settings', 'homepage_settings',
    'form_settings', 'social_media_settings', 'security_settings', 'hero_media',
    'events', 'event_coordinators', 'event_categories', 'schedule_days', 'schedule_events',
    'roadmap_milestones', 'event_winners', 'notifications',
    'admin_users', 'admin_permissions', 'registrations', 'sponsors', 'sponsorship_packages',
    'gallery_images', 'faculty_heads', 'core_committees', 'core_team_members',
    'sports_committees', 'sports_team_members', 'band_members', 'guest_artists'
  ];
  
  const results = {};
  for (const t of tables) {
    // Robust check: just try to select 1 row, any column
    const { error } = await supabase.from(t).select('*').limit(1);
    results[t] = error ? `MISSING (${error.message})` : 'OK';
  }
  
  console.log(JSON.stringify(results, null, 2));
}

checkAllPossibleTables();
