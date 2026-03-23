import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Fallback for environment variables (Netlify vs Local)
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'rico-backend';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const body = event.body ? JSON.parse(event.body) : {};
    const { passcode } = body;
    
    if (!passcode) {
      console.log('[Verify-Council] ❌ Error: Passcode is missing');
      return { statusCode: 400, body: JSON.stringify({ error: 'Passcode is required' }) };
    }

    let correctPasscode: string | null = null;
    let source = 'unknown';

    // 1. Try Supabase RPC (New Hashed System - Primary)
    try {
      const { getSupabaseClient } = await import('./lib/supabase');
      const adminClient = getSupabaseClient(true);
      
      const { data: isValid, error: rpcError } = await adminClient.rpc('verify_council_password', { 
        p_password: passcode 
      });
      
      if (!rpcError && isValid === true) {
        correctPasscode = passcode; // Use input as the correct one since it matched the hash
        source = 'supabase_rpc';
        console.log('[Verify-Council] ✅ Matched using Supabase RPC (Hashed)');
      } else if (rpcError) {
        console.warn('[Verify-Council] Supabase RPC failed/missing:', rpcError.message);
      }
    } catch (rpcErr: any) {
      console.warn('[Verify-Council] RPC error:', rpcErr.message);
    }

    // Firestore REST API fallback removed as part of consolidation to Supabase.


    // 3. Try Supabase Plaintext column (Old Fallback)
    if (!correctPasscode) {
      try {
        const { getSupabaseClient } = await import('./lib/supabase');
        const adminClient = getSupabaseClient(true);
        
        const { data: settings, error: sbError } = await adminClient
          .from('security_settings')
          .select('council_passcode')
          .eq('id', 1)
          .single();
        
        if (!sbError && settings?.council_passcode) {
          correctPasscode = settings.council_passcode;
          source = 'supabase_plaintext';
          console.log('[Verify-Council] Fetched passcode from Supabase plaintext');
        }
      } catch (sbErr: any) {
        console.warn('[Verify-Council] Supabase plaintext fallback error:', sbErr.message);
      }
    }
      
    if (!correctPasscode) {
      console.log('[Verify-Council] ❌ ERROR: Passcode not found or mismatch in RPC');
      return { statusCode: 401, body: JSON.stringify({ error: 'Council access denied. Verification failed.' }) };
    }

    const passMatch = passcode.trim() === correctPasscode.trim();
    console.log(`[Verify-Council] Matching: Input("${passcode.substring(0,2)}...", len: ${passcode.length}) vs ${source}("${correctPasscode.substring(0,2)}...", len: ${correctPasscode.length}) | Match: ${passMatch}`);

    if (!passMatch) {
      console.log('[Verify-Council] ❌ Error: Passcode mismatch');
      return { 
        statusCode: 401, 
        body: JSON.stringify({ 
          error: 'Invalid passcode',
          hint: `Expected ${correctPasscode.length} characters, starts with "${correctPasscode.substring(0,1)}"`
        }) 
      };
    }

    const email = 'sports.council@rico.family';
    const password = process.env.COUNCIL_SECRET_PASSWORD || process.env.VITE_COUNCIL_SECRET_PASSWORD || 'R1c0_Sp0rt5_C0unc1l_H1dd3n_P@ssw0rd!';
    
    if (!password) {
      // This case is now effectively impossible due to fallback, but kept for logic
      console.log('[Verify-Council] Available env keys:', Object.keys(process.env).filter(k => k.includes('SECRET') || k.includes('PASS') || k.includes('KEY')));
      return { 
        statusCode: 500, 
        body: JSON.stringify({ 
          error: 'Backend configuration error: Missing secret key.',
          details: 'Check Netlify environment variables or local .env file.'
        }) 
      };
    }
    
    console.log(`[Verify-Council] ✅ Success for: ${email}`);
    
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
