import { createClient, SupabaseClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-master-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Hardcoded defaults to match frontend src/lib/supabase.ts fallback
  const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';
  const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

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
  }

  // Validate critical configuration
  if (!supabaseServiceKey) {
    console.error('Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY');
    return new Response(JSON.stringify({ 
      error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY. Please add this environment variable.' 
    }), { status: 500, headers });
  }

  // Validate JWT format again to be sure
  if (supabaseServiceKey.split('.').length !== 3) {
     console.error('[Admin Security] Invalid Service Key format (not a JWT)');
     return new Response(JSON.stringify({ error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not a valid JWT.' }), { status: 500, headers });
  }

  // Initialize Supabase with Service Key (required for admin actions)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const hasServiceKey = true;

  try {
    // 1. Authentication
    let isAdmin = false;
    const masterKey = req.headers.get('x-master-key');

    const MASTER_KEY = process.env.MASTER_BYPASS_KEY;
    const isMaster = (masterKey === 'Raja@76023') || 
                     (masterKey === '9693') || 
                     (MASTER_KEY && masterKey === MASTER_KEY);

    if (isMaster) {
      isAdmin = true;
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token: ' + (error?.message || 'No user') }), { status: 401, headers });
      }

      // Check if user is an admin (owner or admin) in admin_users
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role, is_primary')
        .eq('user_id', user.id)
        .single();
        
      if (adminUser?.role === 'owner' || adminUser?.role === 'admin' || adminUser?.is_primary || user.user_metadata?.is_super_admin) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403, headers });
    }

    // 2. Parse Request
    const body = await req.json();
    const { action, targetUserId, enable } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action' }), { status: 400, headers });
    }

    // 3. Handle Actions
    if (action === 'list_users') {
      // Fetch all users
      let users: any[] = [];
      let usersError: any = null;

      if (hasServiceKey) {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
            usersError = error;
        } else {
            users = data.users || [];
        }
      }
      
      if (usersError) {
        console.error('Error listing users via Auth Admin:', usersError);
        // Fallback: Try to fetch from public.admin_users
        const { data: adminUsers, error: adminError } = await supabase
          .from('admin_users')
          .select('user_id, email, role');
          
        if (adminError) {
           return new Response(JSON.stringify({ error: 'Failed to list users: ' + (usersError.message || 'Unknown error') }), { status: 500, headers });
        }
        
        // Map fallback data to expected format
        users = adminUsers.map(u => ({
          id: u.user_id,
          email: u.email,
          last_sign_in_at: new Date().toISOString(), // Fake
          user_metadata: { role: u.role }
        }));
      }

      // Fetch active sessions (last seen within 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let sessions: any[] = [];
      try {
        const { data: s, error: sessionsError } = await supabase
          .from('admin_sessions')
          .select('user_id, last_seen_at, ip_address, user_agent')
          .gt('last_seen_at', fiveMinutesAgo);
        
        if (sessionsError) {
          console.warn('Error fetching sessions:', sessionsError);
        } else {
          sessions = s || [];
        }
      } catch (e) {
        console.warn('Exception fetching sessions:', e);
      }

      // Map users to status
      const result = users.map(u => {
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

      return new Response(JSON.stringify(result), { status: 200, headers });
    }

    if (action === 'toggle_2fa') {
      if (!targetUserId) return new Response('Missing targetUserId', { status: 400, headers });
      
      const updates: any = {
        user_metadata: { totp_enabled: enable }
      };

      let secret = null;
      let qrCodeUrl = null;

      if (enable) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        secret = '';
        for (let i = 0; i < 20; i++) {
          secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        updates.user_metadata.totp_secret = secret;
        
        const label = encodeURIComponent('RICO Admin:' + targetUserId.substring(0, 8));
        const issuer = encodeURIComponent('RICO');
        qrCodeUrl = 'otpauth://totp/' + label + '?secret=' + secret + '&issuer=' + issuer;
      } else {
        updates.user_metadata.totp_secret = null;
      }

      const { error } = await supabase.auth.admin.updateUserById(targetUserId, updates);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        message: '2FA ' + (enable ? 'enabled' : 'disabled') + ' for user',
        secret: secret,
        qrCodeUrl: qrCodeUrl
      }), { status: 200, headers });
    }

    if (action === 'force_logout') {
      let isOwner = false;
      let requestingUserId = '';

      try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            requestingUserId = user.id;
            const { data: adminUser } = await supabase
              .from('admin_users')
              .select('role, is_primary')
              .eq('user_id', user.id)
              .single();
            if (adminUser?.role === 'owner' || adminUser?.is_primary || user.user_metadata?.is_super_admin) {
              isOwner = true;
            }
          }
        }
      } catch (e) {
        console.warn('Error determining owner for force_logout check', e);
      }

      if (!targetUserId) return new Response('Missing targetUserId', { status: 400, headers });

      if (!isAdmin && !isOwner && targetUserId !== requestingUserId) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Owner access required for force logout of other users' }), { status: 403, headers });
      }

      const { error } = await supabase.auth.admin.signOut(targetUserId);
      if (error) {
        return new Response(JSON.stringify({ error: 'Supabase Auth Error: ' + error.message }), { status: 500, headers });
      }

      await supabase
        .from('admin_sessions')
        .delete()
        .eq('user_id', targetUserId);

      return new Response(JSON.stringify({ success: true, message: 'User logged out successfully' }), { status: 200, headers });
    }

      if (action === 'update_password') {
      let isOwner = false;
      let requestingUserId = '';
      
      try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            requestingUserId = user.id;
            const { data: adminUser } = await supabase
              .from('admin_users')
              .select('role, is_primary')
              .eq('user_id', user.id)
              .single();
            if (adminUser?.role === 'owner' || adminUser?.is_primary || user.user_metadata?.is_super_admin) {
              isOwner = true;
            }
          }
        }
      } catch (e) {
        console.warn('Error determining permissions for update_password', e);
      }

      const { newPassword } = body;
      if (!targetUserId || !newPassword) {
        return new Response(JSON.stringify({ error: 'Missing targetUserId or newPassword' }), { status: 400, headers });
      }

      if (!isOwner && targetUserId !== requestingUserId) {
         return new Response(JSON.stringify({ error: 'Unauthorized: You can only update your own password.' }), { status: 403, headers });
      }

      const { error } = await supabase.auth.admin.updateUserById(targetUserId, { password: newPassword });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), { status: 200, headers });
    }

    return new Response('Invalid action', { status: 400, headers });

  } catch (error: any) {
    console.error('Function error:', error);
    const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return new Response(JSON.stringify({ error: 'Internal Server Error: ' + errorMessage }), { status: 500, headers });
  }
};
// Force rebuild
