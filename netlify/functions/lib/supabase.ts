import { createClient } from '@supabase/supabase-js';

// Project defaults (matching frontend in src/lib/supabase.ts)
const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';

/**
 * Robust Supabase client initialization for Netlify Functions.
 * Includes project-specific fallbacks to prevent "supabaseUrl is required" errors
 * when environment variables are missing or misconfigured in production.
 */
export const getSupabaseClient = (serviceRole = false) => {
  const url = (
    process.env.VITE_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    DEFAULT_SUPABASE_URL
  ).trim();

  // Use Service Role if requested, otherwise use Anon Key
  const rawKey = serviceRole 
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') 
    : (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '');
  
  const key = rawKey.trim() || DEFAULT_SUPABASE_ANON_KEY;

  if (!url) {
    console.warn('[Supabase Lib] supabaseUrl is missing, using project default');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false // Netlify Functions are stateless
    }
  });
};

// Default instance using service role as most functions need it
export const supabase = getSupabaseClient(true);
