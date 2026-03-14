import { Handler } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-master-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Hardcoded defaults to match frontend src/lib/supabase.ts fallback
  const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = '';
  const DEFAULT_SERVICE_ROLE_KEY = '';

  // Determine which configuration to use
  let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  if (!supabaseUrl) supabaseUrl = DEFAULT_SUPABASE_URL;

  let supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  // Clean the key: remove whitespace and quotes which might be accidentally added in .env
  supabaseServiceKey = supabaseServiceKey.replace(/^["']|["']$/g, '').trim();

  let supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // Helper to normalize URL for comparison (remove trailing slash)
  const normalizeUrl = (url: string) => url.replace(/\/$/, '');

  // If using the default URL, ensure we use the default keys if env vars are missing OR invalid
  if (normalizeUrl(supabaseUrl) === normalizeUrl(DEFAULT_SUPABASE_URL)) {
    // If key is missing or doesn't look like a JWT (3 parts), use default
    if (!supabaseServiceKey || supabaseServiceKey.split('.').length !== 3) {
      console.log('[Admin Security] Using default Service Role Key (Env var missing or invalid)');
      supabaseServiceKey = DEFAULT_SERVICE_ROLE_KEY;
    }
    if (!supabaseAnonKey) supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  // Validate critical configuration
  if (!supabaseServiceKey) {
    console.error('Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY');
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY. Please add this environment variable.' 
      }) 
    };
  }

  // Validate JWT format again to be sure
  if (supabaseServiceKey.split('.').length !== 3) {
     console.error('[Admin Security] Invalid Service Key format (not a JWT)');
     return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not a valid JWT.' })
     };
  }

  // Debug Service Key (Safe Log)
  console.log(`[Admin Security] Service Key Length: ${supabaseServiceKey.length}`);
  console.log(`[Admin Security] Service Key Start: ${supabaseServiceKey.substring(0, 10)}...`);
  console.log(`[Admin Security] Service Key End: ...${supabaseServiceKey.substring(supabaseServiceKey.length - 10)}`);

  // Initialize Supabase with Service Key (required for admin actions)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const hasServiceKey = true; // We now enforce this above

  console.log(`[Admin Security] Initialized with URL: ${supabaseUrl}`);

  try {
    let isAdmin = false;
    let isOwner = false;
    let authUser: any = null;
    const masterKey = event.headers['x-master-key'];

    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    const isMaster = MASTER_KEY && masterKey === MASTER_KEY;

    if (isMaster) {
      isAdmin = true;
      isOwner = true; // Master key is effectively owner
    } else {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!authHeader) {
        console.log('401: Missing authorization header');
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization header' }) };
      }

      const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
      const verification = await verifyAdminHelper(authHeader as string, supabase);
      
      if (!verification.user) {
        console.log('401: Invalid token or user not found');
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token: User session expired or unauthorized.' }) };
      }

      isAdmin = verification.isAdmin;
      isOwner = verification.isOwner;
      authUser = verification.user;
    }

    if (!isAdmin) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    // 2. Parse Request
    const body = JSON.parse(event.body || '{}');
    const { action, targetUserId, enable } = body;

    if (!action) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action' }) };
    }

    // Helper to resolve a targetId (which could be a Firebase UID or email) to a Supabase Auth UUID
    const resolveSupabaseUuid = async (id: string, options: { createIfMissing?: boolean, email?: string } = {}): Promise<string | null> => {
      console.log(`[resolveSupabaseUuid] Resolving ID: ${id}`);
      
      // 1. Check if it's already a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) return id;

      // 2. Identify target email
      let email = options.email || (id.includes('@') ? id : null);
      if (!email) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('email')
          .eq('user_id', id)
          .maybeSingle();
        if (adminUser) email = adminUser.email;
      }

      if (!email) {
        console.log(`[resolveSupabaseUuid] Could not determine email for ID: ${id}`);
        return null;
      }

      console.log(`[resolveSupabaseUuid] Resolved email: ${email}`);

      // 3. Find user in Supabase Auth by email (checking multiple pages if needed)
      let matchedUser: any = null;
      let page = 1;
      let hasMore = true;

      while (hasMore && !matchedUser) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) {
          hasMore = false;
          break;
        }
        matchedUser = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
        if (users.length < 1000) hasMore = false;
        page++;
      }

      if (matchedUser) {
        console.log(`[resolveSupabaseUuid] Found existing user: ${matchedUser.id}`);
        return matchedUser.id;
      }

      // 4. Create user if requested (bridge from Firebase/Google to Supabase Auth)
      if (options.createIfMissing) {
        console.log(`[resolveSupabaseUuid] Creating new Supabase Auth user for: ${email}`);
        const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: Math.random().toString(36).slice(-16), // Temporary random password
          email_confirm: true
        });

        if (createError) {
          console.error(`[resolveSupabaseUuid] Failed to create user:`, createError);
          return null;
        }

        console.log(`[resolveSupabaseUuid] Created new user: ${newUser?.id}`);
        return newUser?.id || null;
      }

      console.log(`[resolveSupabaseUuid] No user found for: ${email}`);
      return null;
    };

    // 3. Handle Actions
    if (action === 'list_users') {
      console.log('Listing users...');
      console.log('Has Service Key:', hasServiceKey);

      // Fetch ALL users (handling pagination)
      let allUsers: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) {
          console.error('Error listing users page:', page, error);
          hasMore = false;
          break;
        }
        if (!data.users || data.users.length === 0) {
          hasMore = false;
          break;
        }
        allUsers = [...allUsers, ...data.users];
        if (data.users.length < 1000) hasMore = false;
        page++;
      }
      
      if (allUsers.length === 0) {
        console.warn('No users found in Supabase Auth, trying fallback...');
        const { data: adminUsers, error: adminError } = await supabase
          .from('admin_users')
          .select('user_id, email, role');
          
        if (!adminError && adminUsers) {
          allUsers = adminUsers.map(u => ({
            id: u.user_id,
            email: u.email,
            user_metadata: { role: u.role }
          }));
        }
      }
      
      // Fetch active sessions
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let sessions: any[] = [];
      try {
        const { data: s } = await supabase
          .from('admin_sessions')
          .select('user_id, last_seen_at, ip_address, user_agent')
          .gt('last_seen_at', fiveMinutesAgo);
        sessions = s || [];
      } catch (e) {
        console.warn('Exception fetching sessions:', e);
      }

      // Map users to status
      const result = allUsers.map(u => {
        const activeSession = sessions.find(s => s.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
          totp_enabled: u.user_metadata?.totp_enabled || false,
          is_online: !!activeSession,
          last_seen: activeSession?.last_seen_at || u.last_sign_in_at,
          ip: activeSession?.ip_address,
          user_agent: activeSession?.user_agent
        };
      });

      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (action === 'toggle_2fa') {
      if (!hasServiceKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Service Key' }) };
      if (!targetUserId) return { statusCode: 400, headers, body: 'Missing targetUserId' };
      
      const uuid = await resolveSupabaseUuid(targetUserId);
      if (!uuid) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Target user does not have a Supabase Auth account.' }) };
      }

      const updates: any = { user_metadata: { totp_enabled: enable } };
      let secret = null;
      let qrCodeUrl = null;

      if (enable) {
        secret = Array.from({ length: 20 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join('');
        updates.user_metadata.totp_secret = secret;
        qrCodeUrl = `otpauth://totp/${encodeURIComponent('RICO Admin:' + uuid.substring(0, 8))}?secret=${secret}&issuer=${encodeURIComponent('RICO')}`;
      } else {
        updates.user_metadata.totp_secret = null;
      }

      const { error } = await supabase.auth.admin.updateUserById(uuid, updates);
      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `2FA ${enable ? 'enabled' : 'disabled'}`,
          secret,
          qrCodeUrl
        })
      };
    }

    if (action === 'force_logout') {
      const isSelf = authUser && (authUser.id === targetUserId || authUser.email?.toLowerCase() === targetUserId.toLowerCase());
      if (!isMaster && !isOwner && !isSelf) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

      const uuid = await resolveSupabaseUuid(targetUserId);
      if (!uuid) {
         await supabase.from('admin_sessions').delete().eq('user_id', targetUserId);
         return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Sessions cleared' }) };
      }

      await supabase.auth.admin.signOut(uuid);
      await supabase.from('admin_sessions').delete().eq('user_id', targetUserId);

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Logged out' }) };
    }

    if (action === 'update_password') {
      const { newPassword } = body;
      if (!targetUserId || !newPassword) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing targetUserId or newPassword' }) };
      }

      // Robust Self Check
      let isSelf = false;
      let targetEmail = null;

      if (authUser) {
        if (authUser.id === targetUserId || authUser.email?.toLowerCase() === targetUserId.toLowerCase()) {
          isSelf = true;
          targetEmail = authUser.email;
        } else {
          const { data: targetUser } = await supabase
            .from('admin_users')
            .select('email')
            .eq('user_id', targetUserId)
            .maybeSingle();
          
          if (targetUser && targetUser.email.toLowerCase() === authUser.email?.toLowerCase()) {
            isSelf = true;
            targetEmail = targetUser.email;
          }
        }
      }
      
      if (!isMaster && !isOwner && !isSelf) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized: You can only update your own password.' }) };
      }

      // Ensure targetEmail is populated for Firebase sync (especially if owner is updating someone else)
      if (!targetEmail && targetUserId) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('email')
          .eq('user_id', targetUserId)
          .maybeSingle();
        if (adminUser) targetEmail = adminUser.email;
        // If still no email, maybe targetUserId is an email
        if (!targetEmail && targetUserId.includes('@')) targetEmail = targetUserId;
      }

      // Resolve UUID with automatic account creation if missing
      const uuid = await resolveSupabaseUuid(targetUserId, { createIfMissing: true, email: targetEmail });
      if (!uuid) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Internal Error: Could not resolve or create Supabase account for this user.' }) };
      }

      console.log(`[update_password] Updating password for UUID: ${uuid}`);
      const { error } = await supabase.auth.admin.updateUserById(uuid, { password: newPassword });
      
      if (error) {
        console.error('Supabase password update error:', error);
        return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
      }

      // --- Firebase Password Synchronization ---
      let firebaseSyncStatus = 'Not attempted';
      try {
        const { firebaseAdmin, isFirebaseAdminPrivileged } = await import('./lib/auth-verify');
        
        if (!isFirebaseAdminPrivileged) {
          firebaseSyncStatus = 'Disabled: FIREBASE_SERVICE_ACCOUNT not configured in environment';
          console.warn('[update_password] Skipping Firebase sync: Missing privileged credentials');
        } else if (targetEmail) {
          try {
            const firebaseUser = await firebaseAdmin.auth().getUserByEmail(targetEmail);
            if (firebaseUser) {
              console.log(`[update_password] Synchronizing password for Firebase user: ${firebaseUser.uid}`);
              await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
                password: newPassword
              });
              firebaseSyncStatus = 'Synchronized successfully';
              console.log(`[update_password] Firebase password synchronized successfully`);
            } else {
              firebaseSyncStatus = 'No Firebase account matched';
            }
          } catch (fError: any) {
            console.error(`[update_password] Firebase sync error:`, fError);
            if (fError.code === 'auth/user-not-found') {
              firebaseSyncStatus = 'User not found in Firebase';
            } else if (fError.code === 'auth/insufficient-permission' || fError.message?.includes('permission') || fError.message?.includes('credentials')) {
              firebaseSyncStatus = 'Insufficient permissions (check FIREBASE_SERVICE_ACCOUNT)';
            } else {
              firebaseSyncStatus = `Sync failed: ${fError.message || fError.code}`;
            }
          }
        } else {
          firebaseSyncStatus = 'No email resolved for synchronization';
        }
      } catch (importError: any) {
        console.error('[update_password] Failed to import firebaseAdmin for sync:', importError);
        firebaseSyncStatus = `Import error: ${importError.message}`;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `Password updated in Supabase. Firebase sync: ${firebaseSyncStatus}`,
          firebase_sync: firebaseSyncStatus
        })
      };
    }

    return { statusCode: 400, headers, body: 'Invalid action' };

  } catch (error: any) {
    console.error('Function error:', error);
    const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error: ' + errorMessage })
    };
  }
};
// Force rebuild
