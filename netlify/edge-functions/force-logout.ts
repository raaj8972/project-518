// @ts-nocheck - This file runs in Deno runtime (Netlify Edge Functions), not Node.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default async (request: Request) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
        keyLength: supabaseServiceKey?.length || 0
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing required environment variables' }),
        { status: 500, headers }
      );
    }

    // Validate service key format (should have 3 parts separated by dots)
    const keyParts = supabaseServiceKey.split('.');
    if (keyParts.length !== 3) {
      console.error('Invalid service key format:', {
        parts: keyParts.length,
        keyPrefix: supabaseServiceKey.substring(0, 20)
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Invalid service key format' }),
        { status: 500, headers }
      );
    }

    // Initialize Supabase with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey.trim(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing targetUserId' }),
        { status: 400, headers }
      );
    }

    // Get the requesting user from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers }
      );
    }

    // Check if user is admin/owner or targeting themselves
    const isSelf = user.id === targetUserId;
    
    if (!isSelf) {
      // Check if user is admin/owner
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('role, is_primary')
        .eq('user_id', user.id)
        .single();

      const isAuthorized = adminUser?.role === 'owner' || 
                          adminUser?.is_primary || 
                          user.user_metadata?.is_super_admin;

      if (!isAuthorized) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Owner access required' }),
          { status: 403, headers }
        );
      }
    }

    // Sign out the target user (invalidates all their sessions)
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(targetUserId);

    if (signOutError) {
      console.error('Sign out error:', signOutError);
      // Don't fail if user is already signed out
      if (!signOutError.message.includes('not found')) {
        return new Response(
          JSON.stringify({ error: 'Failed to sign out user: ' + signOutError.message }),
          { status: 500, headers }
        );
      }
    }

    // Clear admin sessions table
    await supabaseAdmin
      .from('admin_sessions')
      .delete()
      .eq('user_id', targetUserId);

    // Clear admin presence table
    await supabaseAdmin
      .from('admin_presence')
      .delete()
      .eq('user_id', targetUserId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User logged out successfully',
        isSelf 
      }),
      { status: 200, headers }
    );

  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error?.message || 'Unknown') }),
      { status: 500, headers }
    );
  }
};

export const config = { path: '/api/force-logout' };
