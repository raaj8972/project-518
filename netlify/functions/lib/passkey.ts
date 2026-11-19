export function getRpConfig(headers: Record<string, any>) {
  const host = headers.host || headers.Host || '';
  if (process.env.NODE_ENV !== 'production' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    return { rpId: host.split(':')[0], origin: `http://${host}` };
  }
  const url = new URL(process.env.APP_URL || process.env.SITE_URL || 'https://ricorrenza.fun');
  if (url.protocol !== 'https:') throw new Error('Passkeys require HTTPS');
  return { rpId: url.hostname, origin: url.origin };
}
export function signedChallenge(response: any) {
  if (typeof response?.response?.clientDataJSON !== 'string' || response.response.clientDataJSON.length > 16000) throw new Error('Invalid credential');
  const data = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString());
  if (typeof data.challenge !== 'string') throw new Error('Invalid challenge');
  return data.challenge;
}
export const currentChallenge = (record: any) => record && Number.isFinite(Date.parse(record.expires_at)) && Date.parse(record.expires_at) > Date.now();
export async function consumeChallenge(client: any, id: string) {
  const { data, error } = await client.from('passkey_challenges').delete().eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Challenge already used');
}
