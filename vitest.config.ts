import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Tests must use Node's real crypto rather than browser polyfills in server handlers.
export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'node' },
});
