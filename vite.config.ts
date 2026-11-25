import { defineConfig, loadEnv } from 'vite';
import { localApi } from './scripts/local-api';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { publicEnvironment } from './shared/publicEnv';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Backend variables remain server-side, including legacy VITE-named secrets.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) if (process.env[key] === undefined) process.env[key] = value;
  const publicDefines = Object.fromEntries(Object.entries(publicEnvironment(env))
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]));
  return {
  // Disable automatic VITE_* export: full import.meta.env reads must stay filtered too.
  envPrefix: [],
  define: publicDefines,
  plugins: [
    react(),
    localApi(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'vm', 'process'],
      globals: {
        Buffer: false,
        global: false,
        process: false,
      },
    }),
  ],

  cacheDir: 'node_modules/.vite_cache',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'stats.js': 'three/examples/jsm/libs/stats.module.js',
      'stats.js/src/Stats.js': 'three/examples/jsm/libs/stats.module.js',
      'stats.js/build/stats.min.js': 'three/examples/jsm/libs/stats.module.js'
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react', 'three', '@supabase/supabase-js', 'buffer', 'process', 'vite-plugin-node-polyfills/shims/buffer', 'vite-plugin-node-polyfills/shims/global', 'vite-plugin-node-polyfills/shims/process'],
  },
  server: {
    host: 'localhost',
    fs: {
      deny: ['.env', '.env.*', '**/.git/**', '**/*.{pem,key,sql,bak,log}', '**/tmp/**', '**/scratch/**', '**/netlify/**', '**/scripts/**'],
    },
    port: 8081,
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
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
    minify: 'esbuild',
    // Optimize modern JS output
    target: 'esnext',
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

      }
    }
  },
  base: '/',
  };
});
