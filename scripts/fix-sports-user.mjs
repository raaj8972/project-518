
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// Config
const FIREBASE_PROJECT_ID = 'rico-backend';
const COUNCIL_EMAIL = 'sports.council@rico.family';
const COUNCIL_PASSWORD = process.env.COUNCIL_SECRET_PASSWORD || 'R1c0_Sp0rt5_C0unc1l_H1dd3n_P@ssw0rd!';
const COUNCIL_PASSCODE = '1234';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('firebase-service-account.json', 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID
  });
}
const auth = admin.auth();
const db = admin.firestore();
const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

async function run() {
  console.log('--- Ensuring Sports Council User ---');
  
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(COUNCIL_EMAIL);
    console.log('Found existing user:', userRecord.uid);
    // Update password just in case
    await auth.updateUser(userRecord.uid, { password: COUNCIL_PASSWORD });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email: COUNCIL_EMAIL,
        password: COUNCIL_PASSWORD,
        emailVerified: true,
        displayName: 'Sports Council'
      });
      console.log('Created new user:', userRecord.uid);
    } else {
      throw err;
    }
  }

  // Ensure user in Supabase Auth
  try {
    const { data: { users }, error: listErr } = await sb.auth.admin.listUsers();
    const sbUser = users.find(u => u.email === COUNCIL_EMAIL);
    if (!sbUser) {
      await sb.auth.admin.createUser({
        email: COUNCIL_EMAIL,
        password: COUNCIL_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'council' }
      });
      console.log('Created user in Supabase Auth');
    } else {
      console.log('User already exists in Supabase Auth:', sbUser.id);
      await sb.auth.admin.updateUserById(sbUser.id, { password: COUNCIL_PASSWORD });
    }
  } catch (err) {
    console.warn('Supabase Auth error (likely no admin perms):', err.message);
  }

  // Set Custom Claims
  await auth.setCustomUserClaims(userRecord.uid, { admin: true });
  console.log('Set custom claims: admin=true');

  // Upsert to Firestore admin_users
  const adminDoc = {
    user_id: userRecord.uid,
    email: COUNCIL_EMAIL,
    role: 'council',
    can_sports: true,
    can_registrations: true,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  };
  await db.collection('admin_users').doc(userRecord.uid).set(adminDoc, { merge: true });
  console.log('Upserted to Firestore admin_users');

  // Upsert to Supabase admin_users
  const { error: sbErr } = await sb.from('admin_users').upsert({
    user_id: userRecord.uid,
    email: COUNCIL_EMAIL,
    role: 'council'
    // Missing columns: can_sports, can_registrations (They exist in Firestore only)
  });
  if (sbErr) console.error('Supabase Upsert Error:', sbErr.message);
  else console.log('Upserted to Supabase admin_users');

  // Sync Security Settings
  const settingsPatch = {
    id: 1,
    council_passcode: COUNCIL_PASSCODE,
    updated_at: new Date().toISOString()
  };
  
  await db.collection('security_settings').doc('1').set(settingsPatch, { merge: true });
  console.log('Synced Firestore security_settings');
  
  const { error: setErr } = await sb.from('security_settings').upsert(settingsPatch);
  if (setErr) console.error('Supabase Settings Error:', setErr.message);
  else console.log('Synced Supabase security_settings');

  console.log('\nSUCCESS: Sports Council user and settings are ready.');
  console.log('Passcode:', COUNCIL_PASSCODE);
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
