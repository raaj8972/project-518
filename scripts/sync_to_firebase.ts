import { supabase } from '../src/lib/supabase.js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
// 1. Download your Firebase Admin SDK service account JSON file from Firebase Console
//    (Project Settings > Service Accounts > Generate new private key)
// 2. Place it in the same directory as this script and name it 'firebase-service-account.json'
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// --- INITIALIZE DUAL CLIENTS ---
if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: firebase-service-account.json not found!\n');
  console.error('Please download it from Firebase Console (Project Settings > Service Accounts)');
  console.error('and place it in this directory before running the script.\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

// --- BATCH PARAMS ---
const BATCH_SIZE = 500;

// --- COLLECTIONS TO MIGRATE ---
// Ordered roughly by dependency
const collections = [
  'admin_users',
  'site_settings',
  'about_settings',
  'homebound_settings',
  'homepage_settings',
  'form_settings',
  'social_media_settings',
  'security_settings',
  'events',
  'event_categories',
  'event_coordinators',
  'schedule_days',
  'schedule_events',
  'sponsors',
  'sponsorship_packages',
  'roadmap_milestones',
  'event_winners',
  'registrations',
  'memberships',
  'auditions',
  'pass_scans',
  'notifications',
  'entry_passes'
];

async function migrateCollection(tableName: string) {
  console.log(`\n⏳ Migrating table: ${tableName}...`);
  let totalMigrated = 0;
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error(`❌ Error fetching ${tableName} from Supabase:`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    const batch = db.batch();

    for (const row of data) {
      // Use 'id' if it exists, otherwise generate a random one
      const docId = row.id ? String(row.id) : db.collection(tableName).doc().id;
      const docRef = db.collection(tableName).doc(docId);
      
      // Ensure we don't pass undefined values which Firestore dislikes
      const cleanedRow = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v === undefined ? null : v])
      );

      batch.set(docRef, cleanedRow, { merge: true });
    }

    await batch.commit();
    totalMigrated += data.length;
    offset += BATCH_SIZE;
    process.stdout.write(`\r✅ Migrated ${totalMigrated} rows...`);
    
    if (data.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`\n🎉 Finished ${tableName} (${totalMigrated} total rows)`);
}

async function migrateAuthUsers() {
  console.log('\n⏳ Migrating Auth Users...');
  let page = 1;
  let totalMigrated = 0;
  
  // Note: Standard Supabase REST API doesn't allow listing all users easily unless using Admin key.
  // Ensure your supabaseClient in lib/supabase.ts is using the SUPABASE_SERVICE_ROLE_KEY
  // If it's the anon key, this will fail.
  
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
       console.error('❌ Cannot read Supabase users. Check if you are using the Service Role Key.');
       console.error('Error:', error.message);
       return;
    }

    for (const user of users) {
      try {
        await auth.createUser({
          uid: user.id, // Keep same UID
          email: user.email,
          emailVerified: user.email_confirmed_at != null,
          password: 'TemporaryPassword123!', // Users will need to reset password
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
          disabled: false,
        });
        totalMigrated++;
      } catch (err: any) {
        if (err.code === 'auth/uid-already-exists') {
           // Skip
        } else {
           console.warn(`⚠️ Failed to migrate user ${user.email}:`, err.message);
        }
      }
    }
    console.log(`\n🎉 Finished Auth Users (${totalMigrated} total users migrated)`);
    console.log(`⚠️ Important: Users will need to use "Forgot Password" to set a new password on their first login, as bcrypt hashes cannot be directly imported.`);
    
  } catch (err: any) {
    console.error('❌ Failed to migrate Auth Users. Are you using the Service Role Key in lib/supabase.ts?', err.message);
  }
}

async function main() {
  console.log('🚀 Starting Supabase to Firestore Migration...\n');
  
  if (!supabase['auth']['admin']) {
     console.warn('⚠️ WARNING: Supabase Auth Admin API not available or Service Role Key not used.');
     console.warn('⚠️ User accounts will NOT be migrated automatically.');
  } else {
     await migrateAuthUsers();
  }

  for (const table of collections) {
    await migrateCollection(table);
  }

  console.log('\n✅ All migrations complete!');
  process.exit(0);
}

main().catch(console.error);
