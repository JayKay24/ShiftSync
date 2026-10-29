import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook 10 configuration for ShiftSync client application.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    'msw-storybook-addon',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['./public'],
  async viteFinal(config) {
    return {
      ...config,
      define: {
        ...config.define,
        'import.meta.env.VITE_API_URL': JSON.stringify(
          process.env.VITE_API_URL || 'http://localhost:3001/api',
        ),
      },
    };
  },
};

export default config;
