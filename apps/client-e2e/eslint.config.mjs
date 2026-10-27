import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: ['.features-gen/**', 'dist/**', 'playwright-report/**'],
  },
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['src/steps/**/*.ts'],
    rules: {
      'playwright/no-standalone-expect': 'off',
    },
  },
];
