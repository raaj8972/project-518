
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const FIREBASE_PROJECT_ID = 'rico-backend';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSettings() {
  console.log('--- Checking Firestore REST ---');
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/security_settings/1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      console.log('Firestore Data:', JSON.stringify(data, null, 2));
      console.log('Passcode:', data.fields?.council_passcode?.stringValue);
    } else {
      console.error('Firestore REST failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Firestore Error:', err.message);
  }

  console.log('\n--- Checking Supabase ---');
  try {
    if (SUPABASE_URL && SERVICE_ROLE) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data, error } = await adminClient
        .from('security_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) console.error('Supabase Error:', error.message);
      else console.log('Supabase Data:', data);
    } else {
      console.log('Supabase credentials missing');
    }
  } catch (err) {
    console.error('Supabase Catch Error:', err.message);
  }
}

checkSettings();
