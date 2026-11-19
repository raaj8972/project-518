import type { Handler } from '@netlify/functions';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { supabase } from './lib/supabase';
import { getSupabaseClient } from './lib/supabase';
import { secureEvent } from './lib/api-security';
import { getRpConfig, signedChallenge, currentChallenge, consumeChallenge } from './lib/passkey';
const reply = (statusCode: number, data: object) => ({ statusCode, body: JSON.stringify(data) });
const implementation: Handler = async event => {
  try {
    const { response } = JSON.parse(event.body || '{}');
    if (typeof response?.id !== 'string' || response.id.length > 2048) return reply(400, { error: 'Invalid credential' });
    const { data: passkey, error } = await supabase.from('passkeys').select('*').eq('credential_id', response.id).eq('verified_enrollment', true).single();
    if (error || !passkey) return reply(401, { error: 'Passkey verification failed' });
    const challenge = signedChallenge(response);
    const { data: record, error: challengeError } = await supabase.from('passkey_challenges').select('*').eq('challenge', challenge).is('user_id', null).single();
    if (challengeError || !currentChallenge(record)) return reply(400, { error: 'Invalid or expired challenge' });
    const { rpId, origin } = getRpConfig(event.headers || {});
    const result = await verifyAuthenticationResponse({ response, expectedChallenge: record.challenge, expectedOrigin: origin, expectedRPID: rpId, requireUserVerification: true,
      credential: { id: passkey.credential_id, publicKey: Buffer.from(passkey.public_key, 'base64url'), counter: passkey.counter, transports: passkey.transports } });
    if (!result.verified) return reply(401, { error: 'Passkey verification failed' });
    await consumeChallenge(supabase, record.id);
    const { error: updateError } = await supabase.from('passkeys').update({ counter: result.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq('id', passkey.id);
    if (updateError) throw updateError;
    // Resolve the account using the verified credential's owner; never trust a stored email alias.
    const { data: identity, error: identityError } = await supabase.auth.admin.getUserById(passkey.user_id);
    if (identityError || !identity?.user?.email) throw new Error('Account unavailable');
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: identity.user.email });
    if (linkError || !link?.properties?.hashed_token) throw new Error('Session unavailable');
    // Use an isolated client: verifying an OTP must not replace the shared service-role authorization.
    const { data, error: sessionError } = await getSupabaseClient().auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
    if (sessionError || !data.session) throw new Error('Session unavailable');
    return reply(200, { success: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in, token_type: data.session.token_type } });
  } catch { return reply(401, { error: 'Passkey verification failed' }); }
};
export const handler = secureEvent('passkey-login', implementation);
