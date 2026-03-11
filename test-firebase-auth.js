require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const email = 'sports.council@rico.family';
const password = process.env.COUNCIL_SECRET_PASSWORD || 'R1c0_Sp0rt5_C0unc1l_H1dd3n_P@ssw0rd!';

console.log(`Testing auth for ${email} with password: ${password}`);

signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    console.log('Success! UID:', userCredential.user.uid);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed!', error.code, error.message);
    process.exit(1);
  });
