import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static export: relative asset URLs so the site works at a gateway subpath
// or an ENS name. The export is written to the repository-root dist/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
