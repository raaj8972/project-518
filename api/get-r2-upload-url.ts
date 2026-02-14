import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;


export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
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
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    return new Response(JSON.stringify({ 
      uploadUrl, 
      publicUrl: `https://${publicDomain}/${filename}`
    }), { status: 200, headers });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate upload URL' }), { status: 500, headers });
  }
};

