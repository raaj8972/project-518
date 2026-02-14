import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const handler: Handler = async (event) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { filename, filetype } = body;

    if (!filename || !filetype) {
      return new Response(JSON.stringify({ error: 'Missing filename or filetype' }), { status: 400, headers });
    }

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.error('Missing R2 environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers });
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
        'Access-Control-Allow-Origin': '*', 
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
