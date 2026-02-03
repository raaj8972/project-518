import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  try {
    const { email, password } = JSON.parse(event.body || '{}')

    if (!email) return { statusCode: 400, body: 'Email required' }

    // 1. Security Check: Use environment variable, with a secure default requested by user.
    const MASTER_KEY = process.env.MASTER_BYPASS_KEY || 'Raja@76023';
    
    if (password !== MASTER_KEY) {
      console.warn(`[SECURITY] Unauthorized master bypass attempt for email: ${email}`);
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    console.log(`[SECURITY] Master bypass initiated for email: ${email}`);

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SERVICE_ROLE) return { statusCode: 500, body: 'Server config missing (SERVICE_ROLE)' }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Verify user exists and is an admin or owner in the registry
    const { data: adminUser, error: dbErr } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('email', email)
      .maybeSingle();

    if (dbErr || !adminUser) {
      return { statusCode: 403, body: 'Identity verification failed: Account not found in admin registry' }
    }

    // Only owners and admins can use the master bypass
    if (!['owner', 'admin'].includes(adminUser.role)) {
       return { statusCode: 403, body: 'Identity verification failed: Insufficient privileges' }
    }

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
