const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Hardcoded config as fallback if .env.local doesn't have VITE_FIREBASE_*
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyB8MM48e7Rd2v2ywJpq6vKf-ryv4oCxpLI',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'rico-backend.firebaseapp.com',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://rico-backend-default-rtdb.firebaseio.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'rico-backend',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'rico-backend.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '428903413824',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:428903413824:web:f05d8069ba0484487e87a5',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirestore() {
  try {
    console.log('Connecting to Firestore project:', firebaseConfig.projectId);
    const querySnapshot = await getDocs(collection(db, 'sports_seasons'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Firestore Result:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Firestore Error:', err);
    process.exit(1);
  }
}
checkFirestore();
