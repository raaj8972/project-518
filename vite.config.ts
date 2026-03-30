import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'vm', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    'process.env': {},
  },
  cacheDir: 'node_modules/.vite_cache',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'buffer', 'process'],
    exclude: ['lucide-react'],
  },
  server: {
    host: 'localhost',
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
      },
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
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id: string) {
          if (!id) return undefined;
          if (id.includes('node_modules')) {
            // Priority 1: Large core frameworks
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-core';
            
            // Priority 2: Heavy third-party UI/Logic
            if (id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('gsap')) return 'vendor-gsap';
            if (id.includes('lenis')) return 'vendor-lenis';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            
            // Priority 3: Specialized heavy libraries
            if (id.includes('@tensorflow') || id.includes('face-api') || id.includes('@vladmandic')) return 'vendor-ai';
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('@ffmpeg')) return 'vendor-ffmpeg';
            if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-excel';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable')) return 'vendor-pdf';
            if (id.includes('@aws-sdk')) return 'vendor-aws';
            
            return 'vendor-stable';
          }

          // Admin Dashboard — lazy-loaded via router
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