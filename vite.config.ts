import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Local dev/preview ergonomics
  preview: {
    // Ensure we always use the same port if requested
    strictPort: true,
    // Avoid browser caching during preview so HTML/manifest and chunks stay in sync
    headers: {
      'Cache-Control': 'no-store',
    },
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
          xlsx: ['xlsx'],
          gsap: ['gsap'],
          purify: ['dompurify'],
          pdf: ['jspdf', 'jspdf-autotable', 'html2canvas']
        }
      }
    }
  },
  base: '/',
});