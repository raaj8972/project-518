import { Handler } from '@netlify/functions';
import { generateRegistrationOptions, generateAuthenticationOptions } from '@simplewebauthn/server';
import { supabase } from './lib/supabase';
const RP_NAME = 'RICORRENZA';

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    console.log('Passkey Challenge Request Received');
    const { action, userId, email } = JSON.parse(event.body || '{}');
    console.log('Request Body:', { action, userId, email });

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

      const { rpId } = getRpConfig(event.headers);

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

      console.log(`[Passkey Challenge] Creating registration challenge for user: ${userId}`);
      
      // Store challenge
      const { error: insertError } = await supabase.from('passkey_challenges').insert({
        challenge: options.challenge,
        user_id: userId,
        email: email, // Save email for registration flow
      });

      if (insertError) {
        console.error('[Passkey Challenge] Storage error:', insertError);
        return { 
          statusCode: 500, 
          body: JSON.stringify({ 
            error: 'Failed to store registration challenge', 
            details: insertError.message,
            code: insertError.code
          }) 
        };
      }
      
      console.log('[Passkey Challenge] Registration challenge stored successfully');

      return {
        statusCode: 200,
        body: JSON.stringify(options),
      };
    }

    // 2. LOGIN CHALLENGE
    if (action === 'login') {
      const { rpId } = getRpConfig(event.headers);
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

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
  } catch (error: any) {
    console.error('Challenge error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
