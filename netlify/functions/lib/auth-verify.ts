import { getSupabaseClient } from './supabase';
import { sendEmail } from './email';

/**
 * Logs a security event to Supabase security_logs table
 */
async function logSecurityEvent(supabase: any, {
  event_type,
  severity,
  user_id,
  email,
  details = {},
  ip_address
}: {
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  user_id?: string;
  email?: string;
  details?: any;
  ip_address?: string;
}) {
  try {
    const { error } = await supabase
      .from('security_logs')
      .insert({
        event_type,
        severity,
        user_id,
        email,
        details,
        ip_address
      });
    
    if (error) throw error;
    console.log(`[Security Log] Written: ${event_type} (${severity}) for ${email || 'unknown'}`);

    // Immediate Email Alert for Critical Events
    if (severity === 'critical') {
      const ownerEmails = [
        'ricorrenza.theiqcityfestival@gmail.com'
      ];

      await sendEmail({
        to: ownerEmails,
        subject: `🚨 CRITICAL SECURITY ALERT: ${event_type}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ff0000; border-radius: 8px;">
            <h2 style="color: #ff0000;">Critical Security Event Detected</h2>
            <p><strong>Event:</strong> ${event_type}</p>
            <p><strong>User:</strong> ${email || 'Unknown'}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <hr />
            <p><strong>Details:</strong></p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">${JSON.stringify(details, null, 2)}</pre>
            <p style="color: #666; font-size: 12px;">This is an automated security notification from ricorrenza.theiqcityfestival</p>
          </div>
        `
      });
      console.log('[Security Alert] Email sent to owners');
    }
  } catch (err) {
    console.error('[Security Log] Failed to write log:', err);
  }
}


/**
 * Normalized User object across providers
 */
export interface NormalizedUser {
  id: string;
  email?: string;
  role?: string;
  provider: 'supabase' | 'firebase';
}

/**
 * Verifies the authorization header against Supabase
 */
export async function verifyToken(authHeader: string | undefined, existingClient?: any): Promise<NormalizedUser | null> {
  if (!authHeader) {
    console.log('[Auth Verify] No auth header provided');
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token || token === 'undefined' || token === 'null') {
    console.log('[Auth Verify] Invalid token format or missing token');
    return null;
  }

  // 0. Master Bypass Token Check (Rescue Mode)
  const MASTER_KEY = process.env.VITE_MASTER_BYPASS_KEY || process.env.MASTER_BYPASS_KEY;
  if (MASTER_KEY && token === MASTER_KEY) {
    console.log('[Auth Verify] Bypass token recognized');
    return {
      id: 'master-admin-bypass',
      email: 'master@rico.family',
      provider: 'supabase' // Mocked to bypass further token checks
    };
  }

  // 1. Supabase Verification (Single Source of Truth)
  try {
    const supabase = existingClient || getSupabaseClient(true);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    
    if (user && !error) {
      console.log('[Auth Verify] Supabase token verified for:', user.email, 'ID:', user.id);
      return {
        id: user.id,
        email: user.email,
        provider: 'supabase'
      };
    }
    if (error) {
      console.log('[Auth Verify] Supabase verification error:', error.message);
    }
  } catch (err: any) {
    console.log('[Auth Verify] Supabase verification exception:', err.message);
  }

  // Firebase verification removed as part of consolidation to Supabase Auth.

  // Verification handled above


  console.log('[Auth Verify] All token verification methods failed');
  return null;
}

/**
 * Verifies if the requester is an authorized admin (owner or admin)
 */
export async function verifyAdmin(authHeader: string | undefined, supabase: any): Promise<{ isAdmin: boolean; isOwner: boolean; user: NormalizedUser | null }> {
  console.log('[Auth Verify] Starting admin verification...');
  const user = await verifyToken(authHeader, supabase);

  if (!user) {
    console.log('[Auth Verify] User verification failed (no user found from token)');
    return { isAdmin: false, isOwner: false, user: null };
  }

  console.log('[Auth Verify] User identified:', user.email, 'via', user.provider);

  let adminUser: any = null;
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user.id);
  
  // 1. Try Supabase (Default)
  if (isUUID) {
    console.log('[Auth Verify] Searching admin_users in Supabase by user_id (UUID)');
    const { data: idMatch } = await supabase
      .from('admin_users')
      .select('role, is_primary, email, user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    adminUser = idMatch;
  }

  if (!adminUser && user.email) {
    console.log('[Auth Verify] Searching admin_users in Supabase by email:', user.email);
    const { data: emailMatch } = await supabase
      .from('admin_users')
      .select('role, is_primary, email, user_id')
      .eq('email', user.email.toLowerCase().trim())
      .maybeSingle();
    
    if (emailMatch) {
      adminUser = emailMatch;
      console.log('[Auth Verify] Admin found in Supabase via email');
    }
  }

  // Firestore fallback removed to prioritize Supabase source of truth


  const isMasterBypass = (
    user.id === 'master-admin-bypass' || 
    user.email?.toLowerCase() === 'raja@rico.fun' ||
    user.email?.toLowerCase() === 'raaj@rico.fun' ||
    (process.env.VITE_OWNER_EMAILS || '').toLowerCase().split(',').includes(user.email?.toLowerCase() || '')
  );

  const isAdmin = !!adminUser || isMasterBypass;

  if (isMasterBypass && !adminUser) {
    const logDetails = {
      message: 'Hardcoded Master Bypass triggered',
      provider: user.provider,
      userId: user.id,
      timestamp: new Date().toISOString()
    };
    
    console.warn(`[Auth Verify] Hardcoded Master Bypass triggered for: ${user.email}.`);
    
    // Log asynchronously to not block auth flow
    logSecurityEvent(supabase, {
      event_type: 'master_bypass_triggered',
      severity: 'critical',
      user_id: user.id,
      email: user.email,
      details: logDetails
    }).catch(e => console.error('[Auth Verify] Async log failed:', e));
  } else if (!isAdmin && user.email) {
    // Log failed admin attempts
    logSecurityEvent(supabase, {
      event_type: 'admin_access_failed',
      severity: 'warning',
      user_id: user.id,
      email: user.email,
      details: { message: 'User attempted admin access without permissions' }
    }).catch(e => console.error('[Auth Verify] Async log failed:', e));
  }

  const isOwner = !!(adminUser?.role === 'owner' || adminUser?.is_primary) || isMasterBypass;

  console.log('[Auth Verify] Final result - isAdmin:', isAdmin, 'isOwner:', isOwner, 'Email:', user.email, 'Bypass Used:', !adminUser && isMasterBypass);

  return { isAdmin, isOwner, user };
}
