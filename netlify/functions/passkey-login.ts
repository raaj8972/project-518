import { Handler } from '@netlify/functions';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { supabase } from './lib/supabase';

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

  // Declare at function scope for error handling
  let passkey: any = null;

  try {
    const { response } = JSON.parse(event.body || '{}');
    if (!response) return { statusCode: 400, body: JSON.stringify({ error: 'Missing response' }) };

    const credentialID = response.id;
    
    console.log('Passkey login attempt');
    console.log('Credential ID from response:', credentialID);
    console.log('Credential ID type:', typeof credentialID);

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
      return { statusCode: 400, body: JSON.stringify({ error: 'Passkey not found' }) };
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
        return { 
          statusCode: 429, 
          body: JSON.stringify({ 
            error: `Too many failed attempts. Please try again in ${remainingMinutes} minute(s).` 
          }) 
        };
      } else {
        // Lockout period passed, reset counter
        await supabase
          .from('passkeys')
          .update({ failed_attempts: 0, last_attempt_at: null })
          .eq('id', passkey.id);
      }
    }

    // 2. Retrieve the challenge (we might need to store it by a session ID or just look for *any* recent challenge if we don't have user ID yet)
    // In a real app, we'd pass a temporary session ID. For simplicity, we'll check the most recent challenge.
    // A better way is to pass the challenge ID back from the client if we stored it there.
    // Let's assume we can verify against the challenge stored in the DB.
    // Since we don't have a user ID yet, we might need to query challenges differently.
    // For now, let's query the most recent challenge created in the last 2 minutes.
    // This is a simplification; ideally, use a signed cookie for the challenge.
    
    // BETTER: Client sends back the challenge they signed? No, that's insecure.
    // We'll fetch the most recent challenge from the `passkey_challenges` table that matches the one in the response clientDataJSON?
    // We can't know which one it is without decoding.
    // Let's just fetch the most recent challenge globally (low traffic) or require the client to send the challenge ID.
    
    // Let's assume the client sends the challenge ID they used (we can return it in the challenge step).
    // Updating passkey-challenge to return challenge ID?
    // Actually, `response.clientDataJSON` contains the challenge. We verify it matches *one* of our stored challenges.
    
    // For now, let's just look for the challenge string in our DB.
    const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge;

    const { data: challengeRecord } = await supabase
      .from('passkey_challenges')
      .select('*')
      .eq('challenge', challenge)
      .single();

    if (!challengeRecord) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or expired challenge' }) };

    // Validate challenge hasn't expired
    const expiresAt = new Date(challengeRecord.expires_at);
    const nowChallenge = new Date();
    if (nowChallenge > expiresAt) {
      // Delete expired challenge
      await supabase.from('passkey_challenges').delete().eq('id', challengeRecord.id);
      return { statusCode: 400, body: JSON.stringify({ error: 'Challenge expired. Please try again.' }) };
    }

    // 3. Verify
    const { rpId, origin } = getRpConfig(event.headers);

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
      // We need to generate a JWT for this user
      // Supabase Admin API can create a session
      // Note: createSession is not always exposed in JS client, might need magic link or custom JWT minting.
      // Actually, `admin.generateLink` or `signInWithIdToken`?
      // Supabase doesn't easily let us mint a token without a password/provider.
      // Workaround: Use `admin.createUser` (if new) or just return a custom token?
      // No, we want a real Supabase session.
      // We can use `admin.auth.signInWithIdToken` if we had an OIDC provider.
      // OR, we can use the "Magic Link" trick: generate a magic link and return the token? No, that requires email.
      
      // BEST WAY: Use `supabase.auth.admin.createSession` (if available in recent versions) or just sign a JWT manually if we have the secret.
      // Since we have the SERVICE_ROLE key, we can use `admin.generateLink({ type: 'magiclink', email: ... })` and get the `action_link`, then parse the token?
      // Or `admin.signOut`?
      
      
      // Get the user's email for session creation
      let userEmail = passkey.email;
      
      if (!userEmail) {
        console.log('[Passkey Login] Email not in passkey record, checking admin_users for:', passkey.user_id);
        // Fallback 1: Try admin_users table (for Firebase users who already have mapping)
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('email')
          .eq('user_id', passkey.user_id)
          .maybeSingle();
        
        if (adminUser?.email) {
          userEmail = adminUser.email;
          console.log('[Passkey Login] Email found in admin_users:', userEmail);
        } else {
          console.log('[Passkey Login] Email not in admin_users, falling back to Supabase Auth');
          // Fallback 2: Try Supabase Auth (for native Supabase users)
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(passkey.user_id);
            userEmail = userData?.user?.email;
            if (userEmail) console.log('[Passkey Login] Email found in Supabase Auth:', userEmail);
          } catch (e) {
            console.warn('[Passkey Login] Supabase Auth lookup failed:', e);
          }
        }
      }
      
      if (!userEmail) {
        console.error('[Passkey Login] Could not resolve email for user_id:', passkey.user_id);
        throw new Error('User email not found for session creation');
      }

      // Use the resolved email for the rest of the function
      const emailForSession = userEmail;
      
      console.log(`[Passkey Login] Proceeding to create session for: ${emailForSession}`);
      
      // Generate a magic link for the user to establish a session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: emailForSession,
        options: {
          redirectTo: origin, // Use the detected origin
        },
      });
      
      if (linkError || !linkData) {
        console.error('Link generation error:', linkError);
        throw new Error('Failed to create session');
      }

      console.log('Link data keys:', Object.keys(linkData));
      console.log('Properties keys:', Object.keys(linkData.properties || {}));

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
        
        console.log('Session created successfully');
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            session: {
              access_token: session.session.access_token,
              refresh_token: session.session.refresh_token,
              expires_in: session.session.expires_in,
              token_type: session.session.token_type,
            },
          }),
        };
      }

      // Fallback: try to extract from action_link
      const actionLink = linkData.properties?.action_link;
      
      if (!actionLink) {
        console.error('No hashed_token or action_link in response');
        throw new Error('No session data in response');
      }
      
      console.log('Action link:', actionLink);
      
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
      
      console.log('Extracted tokens:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        expiresIn 
      });
      
      if (!accessToken || !refreshToken) {
        console.error('Hash params:', url.hash);
        console.error('Query params:', url.search);
        throw new Error('Failed to extract session tokens');
      }

      // Return the tokens directly so the client can establish the session
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          session: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: parseInt(expiresIn || '3600'),
            token_type: 'bearer',
          },
        }),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ verified: false }) };
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
    
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
