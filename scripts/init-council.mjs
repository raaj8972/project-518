import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// 1. Firebase Initialisation
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

// 2. Supabase Initialisation
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const email = 'sports.council@rico.family';
const password = process.env.COUNCIL_SECRET_PASSWORD || 'R1c0_Sp0rt5_C0unc1l_H1dd3n_P@ssw0rd!';

async function run() {
  console.log('Initializing sports council account...');
  
  // 3. Create or update Firebase User
  let uid = '';
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log('Firebase user already exists, updating password...');
    await auth.updateUser(userRecord.uid, { password });
    uid = userRecord.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const userRecord = await auth.createUser({ email, password, emailVerified: true });
      uid = userRecord.uid;
      console.log('Created Firebase user with uid:', uid);
    } else {
      throw err;
    }
  }

  // 4. Try to create Supabase Auth User (in case they need it for storage policies)
  try {
    const { data: supaUser, error: findErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (findErr && !findErr.message.includes('already registered')) {
      console.error('Supabase Auth warning:', findErr.message);
    } else if (supaUser && supaUser.user) {
      console.log('Created Supabase auth user:', supaUser.user.id);
    }
  } catch (err) {
    console.warn('Could not create Supabase user:', err.message);
  }

  // 5. Add to admin_users in Firestore (This drives the React Admin UI permissions)
  await db.collection('admin_users').doc(uid).set({
    email,
    user_id: uid,
    role: 'sports_admin',
    is_primary: false,
    can_sports: true, // Grants access to all 4 sports admin tabs natively
    added_at: new Date().toISOString()
  }, { merge: true });

  console.log('Enabled Sports Admin privileges in Firestore admin_users table under UID:', uid);
  console.log('Council setup complete!');
}

run().catch(console.error);
