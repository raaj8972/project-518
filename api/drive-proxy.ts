import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Google Drive Image Proxy with Cloudflare R2 Cache (Vercel Node.js Function)
 */

const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET      = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_HOST = process.env.R2_PUBLIC_DOMAIN || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let _s3: S3Client | null = null;
function getS3() {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
  });
  return _s3;
}

function r2Key(fileId: string, width: number) {
  return `drive-cache/${fileId}/w${width}`;
}

function r2PublicUrl(key: string) {
  return `https://${R2_PUBLIC_HOST}/${key}`;
}

export default async function handler(req: any, res: any) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).set(CORS_HEADERS).send('');
    return;
  }

  const fileId = req.query.id as string;
  if (!fileId || !/^[\w-]{10,}$/.test(fileId)) {
    res.status(400).set(CORS_HEADERS).json({ error: 'Missing or malformed file ID' });
    return;
  }

  const width = parseInt((req.query.width as string) || '1600', 10);
  const safeWidth = Math.min(Math.max(width, 100), 4000);

  const key = r2Key(fileId, safeWidth);
  const publicUrl = r2PublicUrl(key);
  const s3 = getS3();

  // 1. Check R2 cache
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      // Cache HIT
      res.redirect(302, publicUrl);
      return;
    } catch {
      // Cache MISS
    }
  }

  // 2. Fetch from Google Drive
  const urlCandidates = [
    ...(safeWidth < 1600 ? [`https://drive.google.com/thumbnail?id=${fileId}&sz=w${safeWidth}`] : []),
    `https://lh3.googleusercontent.com/u/0/d/${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${safeWidth}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ];

  for (const driveUrl of urlCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(driveUrl, {
        headers: { 'User-Agent': USER_AGENT },
        show_headers: true, // internal flag? Just fetch normally.
        redirect: 'follow',
        signal: controller.signal,
      } as any);
      clearTimeout(timeout);

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (contentType.includes('text/html')) {
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Upload to R2
      if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET) {
        try {
          // Fire and forget upload? No, Vercel kills process after response.
          // Must await upload OR use waitUntil (Edge only).
          // For Node, we must await.
          await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          }));

          res.redirect(302, publicUrl);
          return;
        } catch (r2Err) {
          console.warn('R2 upload failed', r2Err);
        }
      }

      // Fallback: return image directly
      res.status(200)
         .set({
           ...CORS_HEADERS,
           'Content-Type': contentType,
           'Cache-Control': 'public, max-age=3600'
         })
         .send(buffer);
      return;

    } catch (err) {
      // Try next candidate
    }
  }

  res.status(502).set(CORS_HEADERS).json({ error: 'Unable to fetch image' });
}
