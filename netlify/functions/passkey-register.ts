import { Handler } from '@netlify/functions';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const getRpConfig = (headers: any) => {
  const host = headers.host || headers.Host || 'localhost';
  // Remove port if present for RP_ID (unless localhost)
  const hostname = host.split(':')[0];
  const rpId = hostname === 'localhost' ? 'localhost' : hostname;
  // Origin needs protocol
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  return { rpId, origin };
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { response, userId } = JSON.parse(event.body || '{}');
    if (!response || !userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing response or userId' }) };

    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient(true);

    console.log(`[Passkey Register] Verifying registration for user: ${userId}`);
    
    // 1. Fetch the most recent challenge for this user
    const { data: challengeData, error: fetchError } = await supabase
      .from('passkey_challenges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error('[Passkey Register] Challenge fetch error:', fetchError);
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: 'Challenge not found or expired', 
          details: `Query for user ${userId} failed: ${fetchError.message}`,
          code: fetchError.code
        }) 
      };
    }

    if (!challengeData) {
      console.warn('[Passkey Register] No challenge data found for user:', userId);
      return { statusCode: 400, body: JSON.stringify({ error: 'Challenge not found or expired' }) };
    }
    
    console.log('[Passkey Register] Found matching challenge record');

    // 1.5. Validate challenge hasn't expired (5 minute window)
    const expiresAt = new Date(challengeData.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      // Delete expired challenge
      await supabase.from('passkey_challenges').delete().eq('id', challengeData.id);
      return { statusCode: 400, body: JSON.stringify({ error: 'Challenge expired. Please try again.' }) };
    }

    const { rpId, origin } = getRpConfig(event.headers);

    // 2. Verify the response
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: [origin, 'http://localhost:5173', 'http://localhost:8888'], // Allow local dev
      expectedRPID: rpId,
    });


    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo || {};
      if (!credential || !credential.id || !credential.publicKey) throw new Error('Missing registration info');

      // Use response.id directly - it's already base64url encoded and matches what the browser sends during login
      const credentialID = response.id;
      const credentialPublicKey = credential.publicKey;
      const counter = credential.counter;
      
      console.log('Registering passkey:');
      console.log('Credential ID to save:', credentialID);
      console.log('User ID:', userId);

      // 3. Store the passkey
      const { error: storeError } = await supabase.from('passkeys').insert({
        user_id: userId,
        email: challengeData.email, // Store email for easier login later
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports,
      });

      if (storeError) throw storeError;



      // Cleanup challenge (single-use enforcement)
      await supabase.from('passkey_challenges').delete().eq('id', challengeData.id);

      return { statusCode: 200, body: JSON.stringify({ verified: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ verified: false, error: 'Verification failed' }) };
  } catch (error: any) {
    console.error('Register error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
