
import { Handler } from '@netlify/functions';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fileKey } = JSON.parse(event.body || '{}');

    if (!fileKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fileKey' }) };
    }

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

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true, message: 'File deleted' }),
    };

  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete file' }),
    };
  }
};

export { handler };
