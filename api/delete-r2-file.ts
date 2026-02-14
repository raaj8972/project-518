
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;


export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { fileKey } = body;

    if (!fileKey) {
      return new Response(JSON.stringify({ error: 'Missing fileKey' }), { status: 400, headers });
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

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);
    
    return new Response(JSON.stringify({ success: true, message: 'File deleted' }), { status: 200, headers });

  } catch (error) {
    console.error('Error deleting file:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete file' }), { status: 500, headers });
  }
};

// Force rebuild
