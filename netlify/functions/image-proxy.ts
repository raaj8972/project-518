import type { Handler } from '@netlify/functions';
import { secureEvent } from './lib/api-security';
import { allowedMediaUrl, fetchImage } from './lib/media-fetch';
const implementation: Handler = async event => {
  const url = event.queryStringParameters?.url;
  if (!url) return { statusCode: 400, body: JSON.stringify({ error: 'Image URL required' }) };
  try { allowedMediaUrl(url); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Image URL is not allowed' }) }; }
  try {
    const { buffer, contentType } = await fetchImage(url);
    return { statusCode: 200, headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600', 'Content-Security-Policy': "default-src 'none'; sandbox" }, body: buffer.toString('base64'), isBase64Encoded: true };
  } catch { return { statusCode: 502, body: JSON.stringify({ error: 'Unable to fetch image' }) }; }
};
export const handler = secureEvent('image-proxy', implementation);
