import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

async function backfill() {
  const db = admin.firestore();
  const snapshot = await db.collection('sports_seasons').get();
  
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.created_at && data.id) {
       // Convert numeric ID (timestamp ms) to ISO string
       const createdAtStr = new Date(Number(data.id)).toISOString();
       await db.collection('sports_seasons').doc(doc.id).update({
         created_at: createdAtStr
       });
       console.log(`Backfilled ${data.name} with created_at: ${createdAtStr}`);
       count++;
    }
  }
  console.log(`Finished backfilling ${count} seasons.`);
}

backfill();
