import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Fallback for environment variables (Netlify vs Local)
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'rico-backend';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        correctPasscode = fields.sports_passcode?.stringValue || null;
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
        const { getSupabaseClient } = await import('./lib/supabase');
        const adminClient = getSupabaseClient(true);
        
        const { data: settings, error: sbError } = await adminClient
          .from('security_settings')
          .select('sports_passcode')
          .eq('id', 1)
          .single();
        
        if (sbError) throw sbError;
        
        if (settings?.sports_passcode) {
          correctPasscode = settings.sports_passcode;
          console.log('[Verify] Fetched passcode from Supabase fallback');
        }
      } catch (sbErr: any) {
        console.warn('[Verify] Supabase fallback error:', sbErr.message);
      }
    }
      
    if (!correctPasscode) {
      console.log('[Verify] ❌ Error: Could not fetch correct passcode from either Firestore or Supabase');
      return { statusCode: 401, body: JSON.stringify({ error: 'Sports passcode not found. Contact Main Admin.' }) };
    }

    const passMatch = passcode.trim() === correctPasscode.trim();
    console.log(`[Verify] Matching: Input("${passcode.substring(0,2)}...", len: ${passcode.length}) vs Expected("${correctPasscode.substring(0,2)}...", len: ${correctPasscode.length}) | Match: ${passMatch}`);

    if (!passMatch) {
      console.log('[Verify] ❌ Error: Passcode mismatch');
      return { 
        statusCode: 401, 
        body: JSON.stringify({ 
          error: 'Invalid passcode',
          hint: `Expected ${correctPasscode.length} characters, starts with "${correctPasscode.substring(0,1)}"`
        }) 
      };
    }

    const email = 'sports.council@rico.family';
    const password = process.env.COUNCIL_SECRET_PASSWORD || process.env.VITE_COUNCIL_SECRET_PASSWORD;
    
    if (!password) {
      console.error('[Verify] ❌ CRITICAL: COUNCIL_SECRET_PASSWORD not found in env!');
      console.log('[Verify] Available env keys:', Object.keys(process.env).filter(k => k.includes('SECRET') || k.includes('PASS') || k.includes('KEY')));
      return { 
        statusCode: 500, 
        body: JSON.stringify({ 
          error: 'Backend configuration error: Missing secret key.',
          details: 'Check Netlify environment variables or local .env file.'
        }) 
      };
    }
    
    console.log(`[Verify] ✅ Success for: ${email}`);
    
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
