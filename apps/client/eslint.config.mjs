import path from 'node:path';
import nx from '@nx/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';

import baseConfig from '../../eslint.config.mjs';
import { importRules } from './eslint-import-rules.mjs';

export default [
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    ignores: ['dist/**/*', 'vite.config.*.timestamp*'],
  },
  {
    files: ['eslint.config.*', 'vite.config.*'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
      'check-file': checkFile,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: path.resolve(import.meta.dirname, 'tsconfig.json'),
        },
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-cycle': ['error', { maxDepth: Infinity }],
      'import/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: importRules,
        },
      ],
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{js,jsx,ts,tsx}': 'KEBAB_CASE',
          '**/*.test.{js,jsx,ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
];
