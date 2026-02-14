import { verifyAuthenticationResponse } from '@simplewebauthn/server';
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

  // Declare at function scope for error handling
  let passkey: any = null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json();
    const { response } = body;
    if (!response) return new Response(JSON.stringify({ error: 'Missing response' }), { status: 400, headers });

    const credentialID = response.id;
    
    console.log('Passkey login attempt');
    console.log('Credential ID from response:', credentialID);

    // 1. Find the passkey in DB
    const { data: passkeyData, error: passkeyError } = await supabase
      .from('passkeys')
      .select('*')
      .eq('credential_id', credentialID)
      .single();

    console.log('Database query result:', { passkey: passkeyData, passkeyError });
    if (!passkeyData) {
      // Let's also try to list all passkeys to debug
      const { data: allPasskeys } = await supabase.from('passkeys').select('credential_id').limit(5);
      console.log('All passkeys in DB:', allPasskeys);
      return new Response(JSON.stringify({ error: 'Passkey not found' }), { status: 400, headers });
    }

    // Assign to function-scoped variable for error handling
    passkey = passkeyData;

    // Rate limiting: Check failed attempts
    const failedAttempts = passkey.failed_attempts || 0;
    const lastAttemptAt = passkey.last_attempt_at ? new Date(passkey.last_attempt_at) : null;
    const now = new Date();
    
    // If 5 or more failed attempts, check if lockout period (5 minutes) has passed
    if (failedAttempts >= 5 && lastAttemptAt) {
      const lockoutEndTime = new Date(lastAttemptAt.getTime() + 5 * 60 * 1000); // 5 minutes
      if (now < lockoutEndTime) {
        const remainingMinutes = Math.ceil((lockoutEndTime.getTime() - now.getTime()) / 60000);
        return new Response(JSON.stringify({ 
          error: `Too many failed attempts. Please try again in ${remainingMinutes} minute(s).` 
        }), { status: 429, headers });
      } else {
        // Lockout period passed, reset counter
        await supabase
          .from('passkeys')
          .update({ failed_attempts: 0, last_attempt_at: null })
          .eq('id', passkey.id);
      }
    }

    // 2. Retrieve the challenge
    const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge;

    const { data: challengeRecord } = await supabase
      .from('passkey_challenges')
      .select('*')
      .eq('challenge', challenge)
      .single();

    if (!challengeRecord) return new Response(JSON.stringify({ error: 'Invalid or expired challenge' }), { status: 400, headers });

    // Validate challenge hasn't expired
    const expiresAt = new Date(challengeRecord.expires_at);
    const nowChallenge = new Date();
    if (nowChallenge > expiresAt) {
      // Delete expired challenge
      await supabase.from('passkey_challenges').delete().eq('id', challengeRecord.id);
      return new Response(JSON.stringify({ error: 'Challenge expired. Please try again.' }), { status: 400, headers });
    }

    // 3. Verify
    const { rpId, origin } = getRpConfig(req.headers);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: [origin, 'http://localhost:5173', 'http://localhost:8888'],
      expectedRPID: rpId,
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64url'),
        counter: passkey.counter,
        transports: passkey.transports,
      } as any,
    });

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;

      // Update counter and reset failed attempts on successful login
      await supabase.from('passkeys').update({ 
        counter: newCounter, 
        last_used_at: new Date(),
        failed_attempts: 0,
        last_attempt_at: null
      }).eq('id', passkey.id);

      // Cleanup challenge
      await supabase.from('passkey_challenges').delete().eq('id', challengeRecord.id);

      // 4. Create Session
      const { data: userData } = await supabase.auth.admin.getUserById(passkey.user_id);
      if (!userData || !userData.user) throw new Error('User not found');
      
      // Validate user account status
      if (!userData.user.email_confirmed_at && !userData.user.phone_confirmed_at) {
        throw new Error('Account not verified');
      }
      
      // Generate a magic link for the user to establish a session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email!,
        options: {
          redirectTo: origin, // Use the detected origin
        },
      });
      
      if (linkError || !linkData) {
        console.error('Link generation error:', linkError);
        throw new Error('Failed to create session');
      }

      // The generateLink response contains hashed_token which we can use
      if (linkData.properties.hashed_token) {
        // Use verifyOtp to convert the hashed token into a session
        const { data: session, error: sessionError } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          token_hash: linkData.properties.hashed_token,
        });
        
        if (sessionError || !session?.session) {
          console.error('Session verification error:', sessionError);
          throw new Error('Failed to verify session');
        }
        
        return new Response(JSON.stringify({
          success: true,
          session: {
            access_token: session.session.access_token,
            refresh_token: session.session.refresh_token,
            expires_in: session.session.expires_in,
            token_type: session.session.token_type,
          },
        }), { status: 200, headers });
      }

      // Fallback: try to extract from action_link
      const actionLink = linkData.properties?.action_link;
      
      if (!actionLink) {
        console.error('No hashed_token or action_link in response');
        throw new Error('No session data in response');
      }
      
      const url = new URL(actionLink);
      
      // Try hash params first (format: #access_token=...)
      let hashParams = new URLSearchParams(url.hash.substring(1));
      let accessToken = hashParams.get('access_token');
      let refreshToken = hashParams.get('refresh_token');
      let expiresIn = hashParams.get('expires_in');
      
      // If not in hash, try query params (format: ?access_token=...)
      if (!accessToken) {
        accessToken = url.searchParams.get('access_token');
        refreshToken = url.searchParams.get('refresh_token');
        expiresIn = url.searchParams.get('expires_in');
      }
      
      if (!accessToken || !refreshToken) {
        throw new Error('Failed to extract session tokens');
      }

      // Return the tokens directly so the client can establish the session
      return new Response(JSON.stringify({ 
        success: true,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: parseInt(expiresIn || '3600'),
          token_type: 'bearer',
        },
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ verified: false }), { status: 400, headers });
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Increment failed attempts if passkey was found
    if (passkey) {
      const currentAttempts = (passkey.failed_attempts || 0) + 1;
      await supabase.from('passkeys').update({
        failed_attempts: currentAttempts,
        last_attempt_at: new Date()
      }).eq('id', passkey.id);
    }
    
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
