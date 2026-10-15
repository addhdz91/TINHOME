import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Dev/preview: `/r/{partnerId}` goes to the emulated redirect (Hosting rewrites it in prod). */
const partnerRedirectProxy = {
  '/r/': {
    target: 'http://127.0.0.1:5001',
    rewrite: (path: string) => `/demo-tinhome/europe-southwest1/partnerRedirect${path}`,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true, proxy: partnerRedirectProxy },
  preview: { proxy: partnerRedirectProxy },
  // The manifest lets scripts/prerender.ts preload the session chunks (not deployed: dotfile).
  build: { sourcemap: 'hidden', manifest: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 15_000,
  },
});
