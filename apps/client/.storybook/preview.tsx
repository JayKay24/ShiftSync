import type { Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';

import '../src/app/global.css';
import { withAppProviders } from './decorators';
import { defaultMswHandlers } from './msw-fixtures';

/**
 * Global Storybook preview configuration.
 */
const preview: Preview = {
  tags: ['autodocs'],
  loaders: [mswLoader()],
  decorators: [withAppProviders],
  parameters: {
    msw: {
      handlers: defaultMswHandlers,
    },
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
