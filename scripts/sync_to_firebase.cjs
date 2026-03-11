const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'firebase-service-account.json');

// --- INITIALIZATION ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- TABLES TO SYNC ---
const TABLES = [
  'admin_permissions',
  'sports_committees',
  'sports_team_members',
  'event_categories',
  'events',
  'event_winners',
  'event_coordinators',
  'notifications',
  'gallery_settings',
  'gallery_images',
  'sponsors',
  'schedule_days',
  'schedule_events',
  'registrations',
  'sponsorship_settings',
  'contact_sections',
  'faculty_heads',
  'core_committees',
  'core_team_members',
  'band_members',
  'sponsorship_packages',
  'homepage_settings',
  'site_settings',
  'hero_media',
  'guest_artists',
  'chief_guests',
  'social_media_settings',
  'homebound_settings',
  'auditions',
  'memberships',
  'form_settings',
  'roadmap_milestones',
  'security_users',
  'pass_registrations',
  'entry_passes'
];

async function syncTable(tableName) {
  console.log(`\n>>> Syncing: ${tableName}`);
  
  // 1. Fetch from Supabase
  const { data, error } = await supabase.from(tableName).select('*');
  
  if (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log(`No data found for ${tableName}. Skipping.`);
    return;
  }
  
  console.log(`Fetched ${data.length} records. Uploading to Firestore...`);
  
  // 2. Upload to Firestore (Batch processing)
  const batchSize = 400; // Firestore limit is 500
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = db.batch();
    const chunk = data.slice(i, i + batchSize);
    
    chunk.forEach(row => {
      // Use 'id' as doc name if exists, else let Firestore generate
      const docId = row.id ? String(row.id) : (row.user_id ? String(row.user_id) : null);
      const docRef = docId ? db.collection(tableName).doc(docId) : db.collection(tableName).doc();
      batch.set(docRef, {
        ...row,
        _synced_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    
    await batch.commit();
    console.log(`  Processed ${Math.min(i + batchSize, data.length)} / ${data.length}`);
  }
  
  console.log(`Done: ${tableName}`);
}

async function runSync() {
  console.log('Starting Supabase -> Firebase Data Migration...');
  
  for (const table of TABLES) {
    try {
      await syncTable(table);
    } catch (err) {
      console.error(`Fatal error syncing ${table}:`, err.message);
    }
  }
  
  console.log('\nMigration Complete! 🚀');
  process.exit(0);
}

runSync();
