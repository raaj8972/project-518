import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) so we can read NEXT_PUBLIC_* as well
  const env = loadEnv(mode, process.cwd(), '');
  const sys = process.env as Record<string, string | undefined>;

  // Accept either VITE_* (Vite default) or NEXT_PUBLIC_* (Next.js style) names
  const mappedSupabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || sys.NEXT_PUBLIC_SUPABASE_URL || sys.VITE_SUPABASE_URL || '';
  const mappedSupabaseAnon = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || sys.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || sys.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Ensure our client code reading import.meta.env.VITE_* sees a value even if only NEXT_PUBLIC_* were set
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(mappedSupabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(mappedSupabaseAnon),
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            vendors: ['xlsx', 'gsap']
          }
        }
      }
    },
    base: '/',
  };
});