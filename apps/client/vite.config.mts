/// <reference types="vitest" />
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isStorybookVitest = process.env.VITEST_STORYBOOK === 'true';

export default defineConfig(async () => {
  const storybookPlugins = [];
  let testConfig: any = {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: [
      'specs/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/client',
      provider: 'v8',
    },
  };

  if (isStorybookVitest) {
    const { storybookTest } = await import(
      '@storybook/addon-vitest/vitest-plugin'
    );
    const { playwright } = await import('@vitest/browser-playwright');

    testConfig = {
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: ['.storybook/vitest-setup.ts'],
    };

    storybookPlugins.push(
      await storybookTest({
        configDir: path.resolve(import.meta.dirname, '.storybook'),
      }),
    );
  }

  return {
    root: import.meta.dirname,
    envDir: path.resolve(import.meta.dirname, '../../'),
    cacheDir: '../../node_modules/.vite/apps/client',
    server: {
      port: 3000,
      host: 'localhost',
    },
    preview: {
      port: 3000,
      host: 'localhost',
    },
    plugins: [react(), tailwindcss(), ...storybookPlugins],
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      outDir: '../../dist/apps/client',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    test: testConfig,
  };
});
