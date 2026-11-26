import { secureEvent } from './lib/api-security';
import { fetchDriveImage, resizeGalleryImage } from './lib/gallery-media';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Handler } from '@netlify/functions';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'X-Content-Type-Options': 'nosniff' };
let s3: S3Client | undefined;
function cacheConfig() {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET_NAME: bucket, R2_PUBLIC_DOMAIN: domain } = process.env;
  if (!account || !accessKeyId || !secretAccessKey || !bucket || !domain) return null;
  try { const url = new URL(domain.includes('://') ? domain : `https://${domain}`); if (url.protocol !== 'https:') return null; return { account, accessKeyId, secretAccessKey, bucket, origin: url.origin }; } catch { return null; }
}
const implementation: Handler = async event => {
  const id = event.queryStringParameters?.id;
  if (!id || !/^[\w-]{10,200}$/.test(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or malformed Drive file ID.' }) };
  const requested = Number(event.queryStringParameters?.width || 1600);
  // A bounded set of sizes keeps the CDN cache small and predictable.
  const width = [320, 640, 960, 1600, 2400].find(size => size >= (Number.isFinite(requested) ? requested : 1600)) || 2400;
  const key = `drive-cache-v2/${id}/w${width}.webp`;
  const cache = cacheConfig();
  if (cache && !s3) s3 = new S3Client({ region: 'auto', endpoint: `https://${cache.account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: cache.accessKeyId, secretAccessKey: cache.secretAccessKey } });
  const redirect = () => ({ statusCode: 302, headers: { ...headers, Location: `${cache!.origin}/${key}`, 'Cache-Control': 'public, max-age=3600' }, body: '' });
  if (cache && event.queryStringParameters?.refresh !== '1') {
    try { await s3!.send(new HeadObjectCommand({ Bucket: cache.bucket, Key: key })); return redirect(); } catch { /* A cache failure must not hide a public photo. */ }
  }
  try {
    const original = await fetchDriveImage(id, width);
    const buffer = await resizeGalleryImage(original.buffer, width);
    if (cache) {
      try { await s3!.send(new PutObjectCommand({ Bucket: cache.bucket, Key: key, Body: buffer, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' })); return redirect(); }
      catch { /* Serve the resized image directly if the cache is unavailable. */ }
    }
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600' }, body: buffer.toString('base64'), isBase64Encoded: true };
  } catch (error) {
    return { statusCode: 502, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: error instanceof Error ? error.message : 'The photo could not be loaded.' }) };
  }
};
export const handler = secureEvent('drive-proxy', implementation);
