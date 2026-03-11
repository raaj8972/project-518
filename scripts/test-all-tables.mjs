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

async function testAllTables() {
  const tables = [
    'about_settings', 'admin_sessions', 'admin_users', 'auditions', 'band_members',
    'chief_guests', 'core_committees', 'core_team_members', 'event_categories', 'event_coordinators',
    'event_winners', 'events', 'faculty_heads', 'form_settings', 'gallery_images',
    'gallery_settings', 'hero_media', 'homebound_settings', 'homepage_settings', 'memberships',
    'notifications', 'registrations', 'roadmap_milestones', 'schedule_days', 'schedule_events',
    'security_settings', 'site_settings', 'social_media_settings', 'sponsors', 'sponsorship_packages',
    'sponsorship_settings', 'sports_committees', 'sports_team_members'
  ];

  console.log('--- Table Status ---');
  let missing = [];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`${t}: ERROR - ${error.message}`);
      missing.push(t);
    } else {
      console.log(`${t}: OK`);
    }
  }
  
  if (missing.length > 0) {
    console.log('\nMissing Tables:', missing);
  } else {
    console.log('\nAll 33 tables are accessible!');
  }
}

testAllTables();
