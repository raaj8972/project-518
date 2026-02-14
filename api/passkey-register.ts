import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Dynamic configuration based on request host handles both Vercel and Custom Domain
const getRpConfig = (headers: Headers) => {
  const host = headers.get('host') || 'localhost';
  // Remove port if present for RP_ID (unless localhost)
  const hostname = host.split(':')[0];
  const rpId = hostname === 'localhost' ? 'localhost' : hostname;
  // Origin needs protocol
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  return { rpId, origin };
};

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers });

  try {
    const body = await req.json();
    const { response, userId } = body;
    if (!response || !userId) return new Response(JSON.stringify({ error: 'Missing response or userId' }), { status: 400, headers });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Fetch the most recent challenge for this user
    const { data: challengeData } = await supabase
      .from('passkey_challenges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!challengeData) return new Response(JSON.stringify({ error: 'Challenge not found or expired' }), { status: 400, headers });

    // 1.5. Validate challenge hasn't expired (5 minute window)
    const expiresAt = new Date(challengeData.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      // Delete expired challenge
      await supabase.from('passkey_challenges').delete().eq('id', challengeData.id);
      return new Response(JSON.stringify({ error: 'Challenge expired. Please try again.' }), { status: 400, headers });
    }

    const { rpId, origin } = getRpConfig(req.headers);

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

      // 3. Save to DB
      const { error } = await supabase.from('passkeys').insert({
        user_id: userId,
        credential_id: credentialID, // Already base64url from response.id
        public_key: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: response.response.transports || [],
      });

      if (error) throw error;

      // Cleanup challenge (single-use enforcement)
      await supabase.from('passkey_challenges').delete().eq('id', challengeData.id);

      return new Response(JSON.stringify({ verified: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ verified: false, error: 'Verification failed' }), { status: 400, headers });
  } catch (error: any) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
