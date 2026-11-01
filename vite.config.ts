import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r('./src/client'),
  publicDir: r('./public'),
  plugins: [svelte()],
  // `npm run dev` serves the client; run `npx wrangler dev` alongside for /api and /ws.
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
    },
  },
  build: {
    outDir: r('./dist/client'),
    emptyOutDir: true,
    // Keep everything as external files so the strict CSP (no inline script) holds.
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
  test: {
    root: r('.'),
    include: ['test/**/*.test.ts'],
  },
});
