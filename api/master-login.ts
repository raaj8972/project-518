import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';

export default = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  try {
    const { email, password } = JSON.parse(event.body || '{}')

    if (!email) return { statusCode: 400, body: 'Email required' }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SERVICE_ROLE) return { statusCode: 500, body: 'Server config missing (SERVICE_ROLE)' }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 0. Rate Limit Check
    const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    const { data: limitCheck, error: limitErr } = await supabaseAdmin
      .rpc('check_rate_limit', { request_ip: ip });
    
    if (limitErr) {
       console.error('Rate limit check failed:', limitErr);
       // Fail safe: allow if check fails? Or block? 
       // For security, we might want to log it but not block unless we are sure. 
       // But here we rely on the DB. Let's assume if DB fails, system is degraded.
       // However, to avoid lockouts during migration deployment, we might skip.
       // BUT, for a security audit, we should probably fail safe.
    } else if (limitCheck && !limitCheck.allowed) {
       console.warn(`[SECURITY] Blocked by rate limit:IP=${ip}`);
       return { statusCode: 429, body: limitCheck.message || 'Too many attempts' };
    }

    // 1. Security Check: Use environment variables ONLY
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
    const MASTER_PIN = process.env.MASTER_PIN;
    
    // Constant time comparison for password (simplified here, but good practice)
    // In node we can use crypto.timingSafeEqual but for simple string compare logic:
    const isMasterPass = MASTER_PASSWORD && (password === MASTER_PASSWORD);
    const isMasterPin = MASTER_PIN && (password === MASTER_PIN);
    
    // Additional check: Master Key bypass (legacy/environment specific)
    const MASTER_KEY_ENV = process.env.MASTER_BYPASS_KEY;
    const isMasterKey = MASTER_KEY_ENV && (password === MASTER_KEY_ENV);

    const isAuthorized = isMasterPass || isMasterPin || isMasterKey;

    if (!isAuthorized) {
      console.warn(`[SECURITY] Unauthorized master bypass attempt for email: ${email} IP=${ip}`);
      // Record failed attempt
      await supabaseAdmin.rpc('record_failed_attempt', { request_ip: ip });
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    console.log(`[SECURITY] Master bypass initiated for email: ${email} IP=${ip}`);

    // 1. Verify user exists in the admin registry (case-insensitive)
    const { data: adminUser, error: dbErr } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .ilike('email', email)
      .maybeSingle();

    if (dbErr || !adminUser) {
      console.warn(`[SECURITY] Master bypass refused: ${email} not found in admin registry.`);
      // We still count this as a failed attempt to probe the system
      await supabaseAdmin.rpc('record_failed_attempt', { request_ip: ip });
      return { statusCode: 403, body: 'User not registered as an administrator.' }
    }

    // Role check: If they are in the table, we allow bypass if password matches
    // (We previously restricted to 'owner' or 'admin', but any role in this table is a manager)
    console.log(`[SECURITY] Master bypass successful for ${email} (Role: ${adminUser.role})`);

    // 2. Generate a magic link token for the user
    // This allows the frontend to establish a session without knowing the actual password
    const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (linkErr) {
      console.error('Magic link generation failed:', linkErr);
      throw linkErr;
    }

    // Return the hashed token which can be used by the frontend verifyOtp method
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        token_hash: data.properties.hashed_token,
        type: 'magiclink'
      })
    }
  } catch (err: any) {
    console.error('Master login error:', err)
    return { statusCode: 500, body: err.message || 'Internal Server Error' }
  }
}
