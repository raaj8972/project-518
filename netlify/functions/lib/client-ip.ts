export function trustedClientIp(headers: Record<string, string | undefined> = {}) {
  // The other provider's header may be attacker-controlled on this deployment.
  if (process.env.VERCEL === '1') return headers['x-vercel-forwarded-for'] || 'unknown';
  if (process.env.NETLIFY === 'true') return headers['x-nf-client-connection-ip'] || 'unknown';
  return 'unknown';
}
