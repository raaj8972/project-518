import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  try {
    const { email, password } = JSON.parse(event.body || '{}')

    if (!email) return { statusCode: 400, body: 'Email required' }

    // 1. Security Check: Use environment variable, with explicit fallbacks requested by user.
    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    
    const isAuthorized = (password === 'Raja@76023') || 
                         (password === '9693') || 
                         (MASTER_KEY && password === MASTER_KEY);

    if (!isAuthorized) {
      console.warn(`[SECURITY] Unauthorized master bypass attempt for email: ${email}`);
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    console.log(`[SECURITY] Master bypass initiated for email: ${email}`);

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SERVICE_ROLE) return { statusCode: 500, body: 'Server config missing (SERVICE_ROLE)' }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Verify user exists in the admin registry (case-insensitive)
    const { data: adminUser, error: dbErr } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .ilike('email', email)
      .maybeSingle();

    if (dbErr || !adminUser) {
      console.warn(`[SECURITY] Master bypass refused: ${email} not found in admin registry.`);
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
