import type { Handler } from '@netlify/functions';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { supabase } from './lib/supabase';
import { verifyToken } from './lib/auth-verify';
import { secureEvent } from './lib/api-security';
import { getRpConfig, signedChallenge, currentChallenge, consumeChallenge } from './lib/passkey';
const reply = (statusCode: number, data: object) => ({ statusCode, body: JSON.stringify(data) });
const implementation: Handler = async event => {
  const user = await verifyToken(event.headers?.authorization || event.headers?.Authorization, supabase);
  if (!user?.email) return reply(401, { error: 'Sign in before adding a passkey' });
  let input; try { input = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Invalid request' }); }
  if (input.userId && input.userId !== user.id) return reply(403, { error: 'Passkeys can only be added to your own account' });
  try {
    const challenge = signedChallenge(input.response);
    const { data: record, error } = await supabase.from('passkey_challenges').select('*').eq('challenge', challenge).eq('user_id', user.id).single();
    if (error || !currentChallenge(record)) return reply(400, { error: 'Invalid or expired challenge' });
    const { rpId, origin } = getRpConfig(event.headers || {});
    const result = await verifyRegistrationResponse({ response: input.response, expectedChallenge: record.challenge, expectedOrigin: origin, expectedRPID: rpId, requireUserVerification: true });
    if (!result.verified || !result.registrationInfo) return reply(400, { error: 'Verification failed' });
    await consumeChallenge(supabase, record.id);
    const { credential } = result.registrationInfo;
    const { error: saveError } = await supabase.from('passkeys').insert({ verified_enrollment: true, user_id: user.id, email: user.email, credential_id: credential.id, public_key: Buffer.from(credential.publicKey).toString('base64url'), counter: credential.counter, transports: credential.transports });
    if (saveError) throw saveError;
    return reply(200, { verified: true });
  } catch { return reply(400, { error: 'Could not verify passkey registration' }); }
};
export const handler = secureEvent('passkey-register', implementation);
