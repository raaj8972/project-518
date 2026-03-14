import { createClient } from '@supabase/supabase-js';

// Project defaults (matching frontend in src/lib/supabase.ts)
const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = '';
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = ''; 

/**
 * Robust Supabase client initialization for Netlify Functions.
 * Includes project-specific fallbacks to prevent "supabaseUrl is required" errors
 * when environment variables are missing or misconfigured in production.
 */
export const getSupabaseClient = (serviceRole = false) => {
  const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const url = (envUrl || DEFAULT_SUPABASE_URL).trim();

  // Use Service Role if requested, otherwise use Anon Key
  const rawKey = serviceRole 
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '') 
    : (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '');
  
  const key = rawKey.trim() || (serviceRole ? DEFAULT_SUPABASE_SERVICE_ROLE_KEY : DEFAULT_SUPABASE_ANON_KEY);

  if (!envUrl) {
    console.warn('[Supabase Lib] URL environment variable missing, using project default');
  }

  if (!rawKey && serviceRole) {
    console.error('[Supabase Lib] SERVICE_ROLE_KEY requested but missing from environment');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false // Netlify Functions are stateless
    }
  });
};

// Default instance using service role as most functions need it
export const supabase = getSupabaseClient(true);
