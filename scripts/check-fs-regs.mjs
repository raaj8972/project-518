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

async function check() {
  const db = admin.firestore();
  const doc1 = await db.collection('sports_seasons').doc('1772965200478').get();
  const doc2 = await db.collection('sports_seasons').doc('1732971380148').get();
  
  console.log("Season 1772965200478:", doc1.exists ? doc1.data() : "NOT FOUND");
  console.log("Season 1732971380148:", doc2.exists ? doc2.data() : "NOT FOUND");
}

check();
