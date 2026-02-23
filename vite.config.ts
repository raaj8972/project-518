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
      '/api': {
        target: 'http://localhost:8888/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
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
            // Only split out truly INDEPENDENT heavy libraries that are
            // lazy-loaded and don't depend on React at load time.
            // Everything else stays in the default chunk so Rollup can
            // resolve the React dependency chain correctly.
            if (id.includes('@tensorflow') || id.includes('face-api') || id.includes('@vladmandic')) return 'vendor-ai';
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('@ffmpeg')) return 'vendor-ffmpeg';
            if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-excel';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable')) return 'vendor-pdf';
            if (id.includes('@aws-sdk')) return 'vendor-aws';
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