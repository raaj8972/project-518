import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'vm'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Local dev/preview ergonomics
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
      },
    },
  },
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
    // Enable minification for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Generate source maps for debugging (disable in production for smaller size)
    sourcemap: false,
    rollupOptions: {
      output: {
        // Use a function so we can place large/rarely-used libraries into
        // separate chunks and keep admin pages out of the main bundle.
        manualChunks(id: string) {
          if (!id) return undefined;
          // Group node_modules into focused vendor chunks where possible
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@supabase') || id.includes('supabase')) return 'vendor-supabase';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('gsap')) return 'vendor-gsap';
            if (id.includes('dompurify')) return 'vendor-purify';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable')) return 'vendor-pdf';
            // Fallback vendor chunk for other node_modules
            return 'vendor';
          }

          // Place admin-only pages in their own chunk to avoid shipping them
          // to anonymous visitors on first load.
          if (id.includes('/src/pages/AdminDashboard') || id.includes('/src/pages/admin') || id.includes('/src/pages/Admin')) {
            return 'admin';
          }

          return undefined;
        }
      }
    }
  },
  base: '/',
});