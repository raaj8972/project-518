/**
 * Get OTP — Retrieves the current OTP for an admin email
 * Usage: node scripts/get-otp.cjs [email]
 * If no email provided, lists all active OTPs.
 */
const admin = require('firebase-admin');
const path = require('path');

const SA_PATH = path.resolve(__dirname, '..', 'firebase-service-account.json');
const DB_URL = 'https://rico-backend-default-rtdb.firebaseio.com';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(SA_PATH)),
    databaseURL: DB_URL
  });
}

const db = admin.database();

async function main() {
  const targetEmail = process.argv[2];
  
  const snapshot = await db.ref('otp').once('value');
  if (!snapshot.exists()) {
    console.log('❌ No OTPs found.');
    process.exit(0);
  }

  const data = snapshot.val();
  let found = false;

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  ACTIVE OTP CODES                        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  for (const [key, val] of Object.entries(data)) {
    const otp = val;
    if (otp.used) continue;
    
    const isExpired = Date.now() > otp.expires_at;
    if (isExpired) continue;

    if (targetEmail && otp.email !== targetEmail.toLowerCase()) continue;

    found = true;
    const expiresIn = Math.round((otp.expires_at - Date.now()) / 1000);
    console.log(`  📧 Email:  ${otp.email}`);
    console.log(`  🔑 OTP:    ${otp.code}`);
    console.log(`  ⏳ Expires: ${expiresIn}s remaining`);
    console.log(`  📅 Created: ${new Date(otp.created_at).toLocaleString()}`);
    console.log('  ─────────────────────────────────');
  }

  if (!found) {
    console.log('  ❌ No active OTPs found' + (targetEmail ? ` for ${targetEmail}` : '') + '.');
    console.log('  💡 Generate one from the login page: Forgot Access Key → Enter email');
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
