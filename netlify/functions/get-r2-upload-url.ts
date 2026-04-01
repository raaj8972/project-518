import { Handler } from '@netlify/functions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const handler: Handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        // 'Access-Control-Allow-Origin': '*' // Restricted by policy,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'text/plain'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { filename: clientFilename, filetype } = JSON.parse(event.body || '{}');

    if (!clientFilename || !filetype) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing filename or filetype' }) };
    }

    // --- SECURITY: MIME Type & Extension Validation ---
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/pdf'
    ];

    const TYPE_EXTENSION_MAP: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
      'application/pdf': 'pdf'
    };

    if (!ALLOWED_TYPES.includes(filetype)) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: `File type ${filetype} not allowed` }) 
      };
    }

    const expectedExtension = TYPE_EXTENSION_MAP[filetype];
    const clientExtension = clientFilename.split('.').pop()?.toLowerCase();

    // Enforce matching extension
    if (clientExtension !== expectedExtension && !(filetype === 'image/jpeg' && clientExtension === 'jpeg')) {
       return { 
         statusCode: 400, 
         body: JSON.stringify({ error: `Extension .${clientExtension} does not match MIME type ${filetype}` }) 
       };
    }

    // --- SECURITY: Enforce Random Filename on Server ---
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const filename = `${timestamp}-${randomStr}.${expectedExtension}`;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.error('Missing R2 environment variables');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      ContentType: filetype,
    });

    // Generate presigned URL (valid for 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Construct public URL (assuming public access or custom domain is setup)
    // If using R2.dev subdomain (not recommended for production due to rate limits/auth), URL is different.
    // Recommended: Connect a custom domain or use R2 public bucket access.
    // For now, we'll return the R2.dev URL or a custom domain if provided via env.
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`; // Fallback might need adjustment based on specific R2 setup
    
    // Better default public URL construction for R2 if no custom domain
    // If public access is enabled: https://pub-<hash>.r2.dev/<key> 
    // BUT we don't know the hash. User MUST provide R2_PUBLIC_DOMAIN in .env for view access.
    
    return {
      statusCode: 200,
      headers: {
        // 'Access-Control-Allow-Origin': '*' // Restricted by policy,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        uploadUrl, 
        publicUrl: `https://${publicDomain}/${filename}`
      }),
    };

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate upload URL' }),
    };
  }
};

export { handler };
