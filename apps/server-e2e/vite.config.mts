/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/server-e2e',
  resolve: {
    alias: {
      '@shiftsync/data-access': path.resolve(
        import.meta.dirname,
        '../../libs/shared/data-access/src/index.ts',
      ),
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    globalSetup: ['./src/support/global-setup.ts'],
    setupFiles: ['./src/support/test-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    forks: {
      singleFork: true,
    },
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/server-e2e',
      provider: 'v8',
    },
  },
});
