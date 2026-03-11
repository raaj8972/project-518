import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

function log(msg) { console.log(msg); }

async function testIt() {
    let correctPasscode = null;
    try {
      log('Fetching from Firestore REST...');
      const FIREBASE_PROJECT_ID = 'rico-backend';
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/security_settings/1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        correctPasscode = data.fields?.council_passcode?.stringValue || null;
        log('Firestore success: ' + correctPasscode);
      } else {
        log('Firestore failed: ' + res.status);
      }
    } catch(e) { log('Firestore error: ' + e.message); }

    if (!correctPasscode) {
        log('Trying Supabase...');
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false }});
        const { data, error } = await adminClient.from('security_settings').select('council_passcode').eq('id', 1).single();
        if (error) log('Supabase error: ' + error.message);
        else {
            correctPasscode = data.council_passcode;
            log('Supabase success: ' + correctPasscode);
        }
    }

    const passcode = '1234';
    const passMatch = passcode.trim() === correctPasscode?.trim();
    log(`Passcode match: ${passMatch} (Input: "${passcode}", Expected: "${correctPasscode}")`);
}

testIt();
