import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r('./src/client'),
  publicDir: r('./public'),
  plugins: [svelte()],
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
