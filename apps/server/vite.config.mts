/// <reference types="vitest" />
import { defineConfig } from 'vite';
import swc from 'unplugin-swc';
import path from 'path';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/server',
  resolve: {
    alias: {
      '@shiftsync/data-access': path.resolve(
        import.meta.dirname,
        '../../libs/shared/data-access/src/index.ts',
      ),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/server',
      provider: 'v8',
    },
  },
});
