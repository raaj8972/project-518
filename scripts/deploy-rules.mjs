import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function deployRules() {
  console.log('🚀 Starting Firestore rules deployment...');
  try {
    const rules = admin.securityRules();
    
    // 1. Create a new ruleset from source
    console.log('📝 Creating new ruleset from local file...');
    const ruleset = await rules.createRuleset({
      content: rulesContent,
      name: 'cloud.firestore'
    });
    
    // 2. Release it to the database
    console.log(`📡 Releasing ruleset: ${ruleset.name}`);
    await rules.releaseFirestoreRuleset(ruleset.name);
    
    console.log('✅ Deployment successful! Firestore rules are now live.');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

deployRules();
