import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = getFirestore();
    const snap = await db.collection('admin_users').get();
    snap.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
    });
  } catch (error) {
    console.log('Error:', error.message);
  }
}
run();
