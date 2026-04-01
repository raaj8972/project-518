import { createClient } from '@supabase/supabase-js';

// Project defaults (matching frontend in src/lib/supabase.ts)
const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';

/**
 * Robust Supabase client initialization for Netlify Functions.
 * Requires environment variables to be set for security.
 */
export const getSupabaseClient = (serviceRole = false) => {
  const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const url = envUrl.trim();

  // Use Service Role if requested, otherwise use Anon Key
  const rawKey = serviceRole 
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '') 
    : (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '');
  
  const key = rawKey.trim();

  if (!url) {
    throw new Error('[Supabase Lib] SUPABASE_URL is missing from environment');
  }

  if (!key) {
    const keyName = serviceRole ? 'SERVICE_ROLE_KEY' : 'ANON_KEY';
    throw new Error(`[Supabase Lib] ${keyName} is missing from environment`);
  }

  return createClient(url, key, {
    auth: {
      persistSession: false // Netlify Functions are stateless
    }
  });
};

// Default instance using service role as most functions need it
export const supabase = getSupabaseClient(true);
