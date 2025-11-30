import { Handler } from '@netlify/functions';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Use ricorrenza.fun for production, localhost only for local dev
const RP_ID = process.env.URL?.includes('localhost') || process.env.CONTEXT === 'dev' ? 'localhost' : 'ricorrenza.fun';
const ORIGIN = RP_ID === 'localhost' ? 'http://localhost:8888' : `https://${RP_ID}`;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { response, userId } = JSON.parse(event.body || '{}');
    if (!response || !userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing response or userId' }) };

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Retrieve the challenge from DB
    // We need to find the challenge associated with this user (or just the challenge string if we passed it back)
    // For security, we should look up by user_id and ensure it's recent
    const { data: challengeData } = await supabase
      .from('passkey_challenges')
      .select('challenge')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!challengeData) return { statusCode: 400, body: JSON.stringify({ error: 'Challenge not found or expired' }) };

    // 2. Verify the response
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: [ORIGIN, 'http://localhost:5173', 'http://localhost:8888'], // Allow local dev
      expectedRPID: RP_ID,
    });


    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo || {};
      if (!credential || !credential.id || !credential.publicKey) throw new Error('Missing registration info');

      // credential.id and credential.publicKey are already Uint8Arrays
      const credentialID = credential.id;
      const credentialPublicKey = credential.publicKey;
      const counter = credential.counter;
      
      // Convert to base64url for storage
      const credentialIDString = Buffer.from(credentialID).toString('base64url');
      
      console.log('Registering passkey:');
      console.log('Credential ID (Uint8Array):', credentialID);
      console.log('Credential ID (base64url):', credentialIDString);
      console.log('Response ID from client:', response.id);

      // 3. Save to DB - convert Uint8Array to base64url string
      const { error } = await supabase.from('passkeys').insert({
        user_id: userId,
        credential_id: credentialIDString,
        public_key: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: response.response.transports || [],
      });

      if (error) throw error;


      // Cleanup challenge
      await supabase.from('passkey_challenges').delete().eq('user_id', userId);

      return { statusCode: 200, body: JSON.stringify({ verified: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ verified: false, error: 'Verification failed' }) };
  } catch (error: any) {
    console.error('Register error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
