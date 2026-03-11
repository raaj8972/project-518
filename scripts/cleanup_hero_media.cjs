const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanup() {
  console.log('--- Cleaning up hero_media duplicates (Admin) ---');
  try {
    const snapshot = await db.collection('hero_media').get();
    let deletedCount = 0;
    
    for (const fireDoc of snapshot.docs) {
      const id = fireDoc.id;
      const data = fireDoc.data();
      
      if (!isNaN(parseInt(id)) && /^\d+$/.test(id)) {
        console.log(`Deleting legacy numeric record: ${id} (page_key: ${data.page_key})`);
        await db.collection('hero_media').doc(id).delete();
        deletedCount++;
      }
    }
    console.log(`Cleanup complete. Deleted ${deletedCount} records.`);
  } catch (err) {
    console.error('Cleanup failed:', err);
  }
}

cleanup().then(() => process.exit(0));
