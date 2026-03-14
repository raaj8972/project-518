import { db } from './src/lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function checkHeroMedia() {
  try {
    const docRef = doc(db, 'hero_media_v2', 'home');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      console.log('Hero Media Data (home):', JSON.stringify(snapshot.data(), null, 2));
    } else {
      console.log('No hero media data found for "home"');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error fetching Firestore data:', error);
    process.exit(1);
  }
}

checkHeroMedia();
