import { Handler } from '@netlify/functions';
import { generateRegistrationOptions, generateAuthenticationOptions } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Use ricorrenza.fun for production, localhost only for local dev
const RP_ID = process.env.URL?.includes('localhost') || process.env.CONTEXT === 'dev' ? 'localhost' : 'ricorrenza.fun';
const RP_NAME = 'Ricorrenza Admin';
const ORIGIN = RP_ID === 'localhost' ? 'http://localhost:8888' : `https://${RP_ID}`;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    console.log('Passkey Challenge Request Received');
    const { action, userId, email } = JSON.parse(event.body || '{}');
    console.log('Request Body:', { action, userId, email });

    // Debugging Supabase environment variables
    console.log('Supabase URL exists:', !!SUPABASE_URL);
    console.log('Service Role exists:', !!SERVICE_ROLE);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. REGISTRATION CHALLENGE
    if (action === 'register') {
      if (!userId || !email) {
        console.error('Missing userId or email for registration');
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or email' }) };
      }

      // Get user's existing authenticators to prevent duplicates
      const { data: existingPasskeys } = await supabase
        .from('passkeys')
        .select('credential_id, transports')
        .eq('user_id', userId);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: Buffer.from(userId), // Convert string to Uint8Array
        userName: email,
        attestationType: 'none',
        excludeCredentials: existingPasskeys?.map(pk => ({
          id: pk.credential_id,
          transports: pk.transports,
        })) || [],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform', // Face ID / Touch ID
        },
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
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
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

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
  } catch (error: any) {
    console.error('Challenge error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
