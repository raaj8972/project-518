import { generateRegistrationOptions, generateAuthenticationOptions } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Use ricorrenza.fun for production, localhost only for local dev
// Dynamic configuration based on request host handles both Vercel and Custom Domain
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
    console.log('Passkey Challenge Request Received');
    const body = await req.json();
    const { action, userId, email } = body;
    console.log('Request Body:', { action, userId, email });

    // Debugging Supabase environment variables
    console.log('Supabase URL exists:', !!SUPABASE_URL);
    console.log('Service Role exists:', !!SERVICE_ROLE);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. REGISTRATION CHALLENGE
    if (action === 'register') {
      if (!userId || !email) {
        console.error('Missing userId or email for registration');
        return new Response(JSON.stringify({ error: 'Missing userId or email' }), { status: 400, headers });
      }

      // Get user's existing authenticators to prevent duplicates
      const { data: existingPasskeys } = await supabase
        .from('passkeys')
        .select('credential_id, transports')
        .eq('user_id', userId);

      const { rpId } = getRpConfig(req.headers);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: rpId,
        userName: email,
        userID: Buffer.from(userId),
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials: existingPasskeys?.map(pk => ({
          id: pk.credential_id,
          type: 'public-key',
          transports: pk.transports as any[],
        })) || [],
        authenticatorSelection: {
          // Allow both platform (Face ID, Touch ID, Windows Hello) and cross-platform (USB keys)
          authenticatorAttachment: undefined, // Don't restrict - works on all devices
          requireResidentKey: false, // More compatible with older devices
          residentKey: 'preferred', // Use resident key if available
          userVerification: 'preferred', // Prefer biometric but allow PIN as fallback
        },
        supportedAlgorithmIDs: [-7, -257], // ES256 and RS256 for broad compatibility
      });

      // Store challenge
      await supabase.from('passkey_challenges').insert({
        challenge: options.challenge,
        user_id: userId,
      });

      return {
        statusCode: 200,
        body: JSON.stringify(options),
      };
    }

    // 2. LOGIN CHALLENGE
    if (action === 'login') {
      const { rpId } = getRpConfig(req.headers);
      const options = await generateAuthenticationOptions({
        rpID: rpId,
        userVerification: 'preferred',
      });

      // Store challenge (no user_id yet for login)
      await supabase.from('passkey_challenges').insert({
        challenge: options.challenge,
      });

      return {
        statusCode: 200,
        body: JSON.stringify(options),
      };
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
  } catch (error: any) {
    console.error('Challenge error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
