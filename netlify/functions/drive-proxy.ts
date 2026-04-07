import { Handler } from '@netlify/functions';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Google Drive Image Proxy with Cloudflare R2 Cache
 *
 * Flow:
 *   1. Check if image already exists in R2 (keyed by fileId + width)
 *   2. If found → 302 redirect to R2 public URL (zero egress from Netlify)
 *   3. If not   → fetch from Google Drive, upload to R2, then redirect
 *
 * Result: Each image is fetched from Google Drive at most ONCE per width.
 *         All subsequent requests are served directly from Cloudflare's CDN.
 */

const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET      = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_HOST = process.env.R2_PUBLIC_DOMAIN || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || ''; // 👈 Added official API key support
if (GOOGLE_API_KEY) {
  console.log('[DriveProxy] GOOGLE_API_KEY initialized.');
} else {
  console.warn('[DriveProxy] GOOGLE_API_KEY missing. Falling back to public endpoints.');
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*', // Relaxed for images
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Lazy-init the S3 client (reused across warm invocations)
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

/** Build the R2 object key for a given file + width */
function r2Key(fileId: string, width: number) {
  return `drive-cache/${fileId}/w${width}`;
}

/** Build the public R2 URL */
function r2PublicUrl(key: string) {
  return `https://${R2_PUBLIC_HOST}/${key}`;
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const fileId = event.queryStringParameters?.id;
  if (!fileId || !/^[\w-]{10,}$/.test(fileId)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing or malformed file ID' }),
    };
  }

  const width = parseInt(event.queryStringParameters?.width || '1600', 10);
  const safeWidth = Math.min(Math.max(width, 100), 4000);

  const key = r2Key(fileId, safeWidth);
  const publicUrl = r2PublicUrl(key);
  const s3 = getS3();

  // ── 1. Check R2 cache ──────────────────────────────────────────
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      // Cache HIT → redirect to Cloudflare CDN
      console.log(`[DriveProxy] R2 cache HIT: ${key}`);
      return {
        statusCode: 302,
        headers: {
          ...CORS_HEADERS,
          Location: publicUrl,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: '',
      };
    } catch {
      // Cache MISS → continue to fetch from Drive
    }
  }

  // ── 2. Fetch from Google Drive ─────────────────────────────────
  const urlCandidates = [
    // Primary: Official API (Best reliability, but limited quota)
    ...(GOOGLE_API_KEY ? [`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_API_KEY}`] : []),
    // Fallbacks: Common thumbnail & viewer patterns (High rate limit, bypass auth)
    `https://lh3.googleusercontent.com/u/0/d/${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${safeWidth}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`, // Try a standard large size as last resort
  ];

  for (const driveUrl of urlCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout for Drive (slower than before)

      const response = await fetch(driveUrl, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[DriveProxy] ${driveUrl.split('?')[0]} returned ${response.status}`);
        // If 429, we might want to break, but let's try other candidates just in case they use different backends
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (contentType.includes('text/html') || contentType.includes('json')) {
         const preview = (await (await response.clone().text())).substring(0, 50);
         console.warn(`[DriveProxy] ${driveUrl.split('?')[0]} returned ${contentType} (Preview: ${preview}), skipping`);
         continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 500) {
        console.warn(`[DriveProxy] File too small (${buffer.length} bytes), likely an error page or spacer.`);
        continue;
      }

      // ── 3. Upload to R2 (fire-and-forget if R2 is configured) ──
      if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET) {
        try {
          await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          }));
          console.log(`[DriveProxy] Cached to R2: ${key} (${(buffer.length / 1024).toFixed(0)} KB)`);

          // Redirect to R2 instead of returning the image through Netlify
          return {
            statusCode: 302,
            headers: {
              ...CORS_HEADERS,
              Location: publicUrl,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
            body: '',
          };
        } catch (r2Err: any) {
          console.warn(`[DriveProxy] R2 upload failed, falling back to direct response: ${r2Err.message}`);
          // Fall through to return image directly
        }
      }

      // Fallback: return image directly through Netlify (if R2 is not configured)
      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true,
      };
    } catch (err: any) {
      console.warn(`[DriveProxy] URL failed (${err?.name || 'unknown'}): ${driveUrl} – ${err?.message || ''}`);
    }
  }

  // All candidates exhausted
  console.error(`[DriveProxy] All URL patterns failed for fileId=${fileId}`);
  return {
    statusCode: 502,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Unable to fetch image from Google Drive' }),
  };
};
