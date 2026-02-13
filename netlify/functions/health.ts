import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: 'ok',
      version: 'v1.4-vercel-debug',
      env: {
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabase_anon: !!process.env.SUPABASE_ANON_KEY,
        google_api_key: !!process.env.GOOGLE_API_KEY,
        r2_config: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME)
      },
      time: new Date().toISOString()
    }),
  };
};
