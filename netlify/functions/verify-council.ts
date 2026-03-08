import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Hardcoded Firebase Project ID
const FIREBASE_PROJECT_ID = 'rico-backend';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const body = event.body ? JSON.parse(event.body) : {};
    const { passcode } = body;
    
    if (!passcode) {
      console.log('[Verify] ❌ Error: Passcode is missing from request body');
      return { statusCode: 400, body: JSON.stringify({ error: 'Passcode is required' }) };
    }

    let correctPasscode: string | null = null;

    // 1. Try Firestore REST API (Zero-dependency, high reliability)
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/security_settings/1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const fields = data.fields || {};
        correctPasscode = fields.council_passcode?.stringValue || null;
        if (correctPasscode) console.log('[Verify] Fetched passcode from Firestore REST');
      } else {
        const errorText = await res.text();
        console.warn('[Verify] Firestore REST failed:', res.status, errorText);
      }
    } catch (fsErr: any) {
      console.warn('[Verify] Firestore fetch error:', fsErr.name === 'AbortError' ? 'Timeout' : fsErr.message);
    }

    // 2. Try Supabase (Fallback)
    if (!correctPasscode) {
      try {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (SUPABASE_URL && SERVICE_ROLE) {
          const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { 
            auth: { persistSession: false }
          });
          
          const { data: settings, error: sbError } = await adminClient
            .from('security_settings')
            .select('council_passcode')
            .eq('id', 1)
            .single();
          
          if (sbError) throw sbError;
          
          if (settings?.council_passcode) {
            correctPasscode = settings.council_passcode;
            console.log('[Verify] Fetched passcode from Supabase fallback');
          }
        }
      } catch (sbErr: any) {
        console.warn('[Verify] Supabase fallback error:', sbErr.message);
      }
    }
      
    if (!correctPasscode) {
      console.log('[Verify] ❌ Error: Could not fetch correct passcode from either Firestore or Supabase');
      return { statusCode: 401, body: JSON.stringify({ error: 'Council passcode not found. Contact Main Admin.' }) };
    }

    const passMatch = passcode.trim() === correctPasscode.trim();
    console.log(`[Verify] Passcode match: ${passMatch} (Input: "${passcode}", Expected: "${correctPasscode}")`);

    if (!passMatch) {
      console.log('[Verify] ❌ Error: Passcodes do not match');
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid passcode' }) };
    }

    const email = 'sports.council@rico.family';
    const password = process.env.COUNCIL_SECRET_PASSWORD || 'R1c0_Sp0rt5_C0unc1l_H1dd3n_P@ssw0rd!';
    
    console.log(`[Verify] Success. Returning credentials for: ${email}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        credentials: { email, password }
      })
    };
  } catch (err: any) {
    console.error('[Verify] Fatal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
};
