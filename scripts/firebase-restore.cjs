/**
 * FIREBASE RESTORE — Restores all Supabase table data FROM Firebase Realtime Database
 * 
 * Usage:  node scripts/firebase-restore.cjs
 *         node scripts/firebase-restore.cjs --force   (skip confirmation)
 * 
 * This reads backed-up data from Firebase and restores it into Supabase.
 * WARNING: This will DELETE existing data in Supabase tables before restoring!
 */

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const readline = require('readline');

// ═══════════════ CONFIG ═══════════════
const SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '..', 'firebase-service-account.json');
const FIREBASE_DB_URL = 'https://rico-backend-default-rtdb.firebaseio.com';

// Order matters! Tables with foreign keys must be restored after their parents.
const RESTORE_ORDER = [
  'site_settings', 'homepage_settings', 'about_settings', 'homebound_settings',
  'security_settings', 'gallery_settings', 'form_settings', 'sponsorship_settings',
  'core_committees', 'event_categories', 'schedule_days',
  'core_team_members', 'events', 'event_coordinators', 'event_winners',
  'schedule_events', 'registrations',
  'sponsors', 'contact_sections', 'gallery_images', 'faculty_heads',
  'guest_artists', 'chief_guests', 'hero_media', 'notifications',
  'admin_users', 'admin_permissions', 'sports_committees', 'sports_team_members',
  'roadmap_milestones', 'validation_rules', 'band_members', 'auditions',
  'login_history', 'memberships'
];
// ══════════════════════════════════════

// Initialize Firebase
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_DB_URL
});
const db = admin.database();

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

async function restoreTable(tableName) {
  const snapshot = await db.ref(`supabase_backup/${tableName}`).once('value');
  const backup = snapshot.val();
  
  if (!backup || !backup.data) {
    console.log(`  ⏭️  ${tableName}: No backup found, skipping`);
    return { table: tableName, status: 'skipped', count: 0 };
  }

  const rows = backup.data;
  if (rows.length === 0) {
    console.log(`  ⏭️  ${tableName}: 0 rows in backup, skipping`);
    return { table: tableName, status: 'empty', count: 0 };
  }

  // Delete existing data
  const { error: deleteErr } = await supabase.from(tableName).delete().gte('id', 0);
  if (deleteErr) {
    await supabase.from(tableName).delete().neq('id', -99999);
  }

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error: insertErr } = await supabase.from(tableName).upsert(batch, { 
      onConflict: 'id', ignoreDuplicates: false 
    });
    if (insertErr) {
      console.log(`  ⚠️  ${tableName}: Insert error: ${insertErr.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✅ ${tableName}: ${inserted}/${rows.length} rows restored`);
  return { table: tableName, status: 'ok', count: inserted };
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  FIREBASE → SUPABASE RESTORE            ║');
  console.log('╚══════════════════════════════════════════╝');

  // Check last sync
  const metaSnap = await db.ref('supabase_backup/_metadata').once('value');
  const meta = metaSnap.val();
  if (meta) {
    console.log(`  Last backup: ${meta.last_sync}`);
    console.log(`  Tables: ${meta.tables_synced}, Total rows: ${meta.total_rows}`);
  } else {
    console.log('  ⚠️  No backup found! Run firebase-sync.cjs first.');
    process.exit(1);
  }

  if (!process.argv.includes('--force')) {
    const answer = await ask('\n  ⚠️  This will REPLACE all Supabase data. Continue? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      console.log('  Aborted.');
      process.exit(0);
    }
  }

  console.log('\n  Restoring tables...\n');
  const results = [];
  for (const table of RESTORE_ORDER) {
    const result = await restoreTable(table);
    results.push(result);
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const totalRows = results.reduce((sum, r) => sum + r.count, 0);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  RESTORE COMPLETE                        ║`);
  console.log(`║  ✅ ${ok} tables restored (${totalRows} total rows)     `);
  console.log('╚══════════════════════════════════════════╝');

  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
