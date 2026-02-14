import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }
  
  try {
    const { email, password } = await req.json();

    if (!email) {
      return new Response('Email required', { status: 400, headers });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SERVICE_ROLE) {
      return new Response('Server config missing (SERVICE_ROLE)', { status: 500, headers });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate Limit Check
    const ip = req.headers.get('client-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const { data: limitCheck, error: limitErr } = await supabaseAdmin
      .rpc('check_rate_limit', { request_ip: ip });
    
    if (limitErr) {
       console.error('Rate limit check failed:', limitErr);
    } else if (limitCheck && !limitCheck.allowed) {
       console.warn(`[SECURITY] Blocked by rate limit:IP=${ip}`);
       return new Response(
         JSON.stringify({ error: limitCheck.message || 'Too many attempts' }),
         { status: 429, headers }
       );
    }

    // Security Check: Use environment variables ONLY
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
    const MASTER_PIN = process.env.MASTER_PIN;
    const MASTER_KEY_ENV = process.env.MASTER_BYPASS_KEY;
    
    const isMasterPass = MASTER_PASSWORD && (password === MASTER_PASSWORD);
    const isMasterPin = MASTER_PIN && (password === MASTER_PIN);
    const isMasterKey = MASTER_KEY_ENV && (password === MASTER_KEY_ENV);

    const isAuthorized = isMasterPass || isMasterPin || isMasterKey;

    if (!isAuthorized) {
      console.warn(`[SECURITY] Unauthorized master bypass attempt for email: ${email} IP=${ip}`);
      await supabaseAdmin.rpc('record_failed_attempt', { request_ip: ip });
      return new Response('Invalid credentials', { status: 401, headers });
    }

    console.log(`[SECURITY] Master bypass initiated for email: ${email} IP=${ip}`);

    // Verify user exists in the admin registry (case-insensitive)
    const { data: adminUser, error: dbErr } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .ilike('email', email)
      .maybeSingle();

    if (dbErr || !adminUser) {
      console.warn(`[SECURITY] Master bypass refused: ${email} not found in admin registry.`);
      await supabaseAdmin.rpc('record_failed_attempt', { request_ip: ip });
      return new Response('User not registered as an administrator.', { status: 403, headers });
    }

    console.log(`[SECURITY] Master bypass successful for ${email} (Role: ${adminUser.role})`);

    // Generate a magic link token for the user
    const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkErr) {
      console.error('Magic link generation failed:', linkErr);
      throw linkErr;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        token_hash: data.properties.hashed_token,
        type: 'magiclink'
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error('Master login error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers }
    );
  }
}
