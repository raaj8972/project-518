import type { Handler } from '@netlify/functions';

// Returns the best-effort client IP.
export const handler: Handler = async (event) => {
  const ipHeader = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || event.headers['x-forwarded-for'] || '';
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : (ipHeader || '').split(',')[0].trim();
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({ ip })
  };
};

export default handler;
