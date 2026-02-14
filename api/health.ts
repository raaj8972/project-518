import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({
      status: 'ok',
      version: 'v1.5-vercel-native-nodejs',
      env: {
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabase_anon: !!process.env.SUPABASE_ANON_KEY,
      },
      time: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
