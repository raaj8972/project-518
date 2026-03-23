import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncToFirestore() {
  const UID = 'q6BLMit9zsQAjCTUhL0DKdXp1kh2';
  const EMAIL = 'sports.council@rico.family';
  
  console.log(`Syncing ${EMAIL} (UID: ${UID}) to Firestore...`);
  
  // 1. Sync admin_users
  await db.collection('admin_users').doc(UID).set({
    user_id: UID,
    id: UID,
    email: EMAIL,
    role: 'council',
    created_at: new Date().toISOString()
  }, { merge: true });
  
  console.log("admin_users synced in Firestore.");

  // 2. Sync admin_permissions
  await db.collection('admin_permissions').doc(UID).set({
    user_id: UID,
    can_sports: true,
    can_registrations: true,
    can_registration_photos: true,
    can_schedule: true,
    can_events: false,
    updated_at: new Date().toISOString()
  }, { merge: true });

  console.log("admin_permissions synced in Firestore.");
  
  console.log("Firestore Sync Complete!");
  process.exit(0);
}

syncToFirestore().catch(err => {
  console.error("Firestore Sync Failed:", err);
  process.exit(1);
});
