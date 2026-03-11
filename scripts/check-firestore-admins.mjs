
const FIREBASE_PROJECT_ID = 'rico-backend';

async function checkFirestoreAdmins() {
  console.log('--- Checking Firestore admin_users via REST ---');
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/admin_users`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      console.log(`Found ${docs.length} admin(s)`);
      docs.forEach(d => {
        const fields = d.fields || {};
        console.log('Admin:', {
          path: d.name,
          email: fields.email?.stringValue,
          role: fields.role?.stringValue,
          user_id: fields.user_id?.stringValue
        });
      });
    } else {
      console.error('Firestore REST failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkFirestoreAdmins();
