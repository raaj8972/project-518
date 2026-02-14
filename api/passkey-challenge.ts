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


const RP_NAME = 'Ricorrenza';

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
    const { action, userId, email } = body;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. REGISTRATION CHALLENGE
    if (action === 'register') {
      if (!userId || !email) {
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
          authenticatorAttachment: undefined,
          requireResidentKey: false,
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      // Store challenge
      await supabase.from('passkey_challenges').insert({
        challenge: options.challenge,
        user_id: userId,
      });

      return new Response(JSON.stringify(options), { status: 200, headers });
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

      return new Response(JSON.stringify(options), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
  } catch (error: any) {
    console.error('Challenge error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

