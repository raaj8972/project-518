import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const user = await getAuth().getUserByEmail('ricorrenza.theiqcityfestival@gmail.com');
    console.log("UID:", user.uid);
    // Let's also set the admin custom claim just to be absolutely bulletproof
    await getAuth().setCustomUserClaims(user.uid, { admin: true });
    console.log("Successfully set custom claim 'admin: true' for UID:", user.uid);
    
    // Also add to admin_users in firestore if not there
    const db = getFirestore();
    await db.collection('admin_users').doc(user.uid).set({
        user_id: user.uid,
        email: 'ricorrenza.theiqcityfestival@gmail.com',
        role: 'owner',
        is_primary: true,
        created_at: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("Added/Updated user in 'admin_users' collection.");

  } catch (error) {
    console.log('Error:', error.message);
  }
}
run();
