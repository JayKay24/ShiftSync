import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    ignores: ['dist/**/*', 'vite.config.*.timestamp*'],
  },
];
