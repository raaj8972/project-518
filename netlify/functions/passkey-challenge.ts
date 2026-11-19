import type { Handler } from '@netlify/functions';
import { generateRegistrationOptions, generateAuthenticationOptions } from '@simplewebauthn/server';
import { supabase } from './lib/supabase';
import { verifyToken } from './lib/auth-verify';
import { secureEvent } from './lib/api-security';
import { getRpConfig } from './lib/passkey';
const reply = (statusCode: number, data: object) => ({ statusCode, body: JSON.stringify(data) });
const implementation: Handler = async event => {
  let input; try { input = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Invalid request' }); }
  const { rpId } = getRpConfig(event.headers || {});
  if (input.action === 'register') {
    const user = await verifyToken(event.headers?.authorization || event.headers?.Authorization, supabase);
    if (!user?.email) return reply(401, { error: 'Sign in before adding a passkey' });
    if (input.userId && input.userId !== user.id) return reply(403, { error: 'Passkeys can only be added to your own account' });
    const { data: existing, error } = await supabase.from('passkeys').select('credential_id, transports').eq('user_id', user.id);
    if (error) throw error;
    const options = await generateRegistrationOptions({ rpName: 'RICORRENZA', rpID: rpId, userName: user.email, userID: Buffer.from(user.id),
      attestationType: 'none', excludeCredentials: (existing || []).map(pk => ({ id: pk.credential_id, transports: pk.transports })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' } });
    const { error: insertError } = await supabase.from('passkey_challenges').insert({ challenge: options.challenge, user_id: user.id, email: user.email, expires_at: new Date(Date.now() + 120000).toISOString() });
    if (insertError) throw insertError;
    return reply(200, options);
  }
  if (input.action === 'login') {
    const options = await generateAuthenticationOptions({ rpID: rpId, userVerification: 'required' });
    const { error } = await supabase.from('passkey_challenges').insert({ challenge: options.challenge, user_id: null, expires_at: new Date(Date.now() + 120000).toISOString() });
    if (error) throw error;
    return reply(200, options);
  }
  return reply(400, { error: 'Invalid action' });
};
export const handler = secureEvent('passkey-challenge', implementation);
