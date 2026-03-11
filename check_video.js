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
    const snap = await db.collection('events').limit(5).get();
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`Event: ${data.title}`);
        console.log(`URL: ${data.motion_poster_url}\n`);
    });
  } catch (error) {
    console.log('Error:', error.message);
  }
}
run();
