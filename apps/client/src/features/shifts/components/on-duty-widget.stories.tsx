import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, within } from 'storybook/test';

import { OnDutyWidget } from './on-duty-widget';

/**
 * Live on-duty roster widget displaying currently clocked-in staff across locations.
 */
const meta: Meta<typeof OnDutyWidget> = {
  title: 'Features/Shifts/OnDutyWidget',
  component: OnDutyWidget,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OnDutyWidget>;

export const ActiveStaff: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = await canvas.findByText(/2 active/i);
    await expect(badge).toBeInTheDocument();
    await expect(canvas.getByText(/charlie staff/i)).toBeInTheDocument();
    await expect(canvas.getByText(/emma server/i)).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/shifts/on-duty', () => {
          return HttpResponse.json([]);
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emptyMsg = await canvas.findByText(/no staff currently on-duty/i);
    await expect(emptyMsg).toBeInTheDocument();
  },
};

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/shifts/on-duty', async () => {
          await delay('infinite');
          return HttpResponse.json([]);
        }),
      ],
    },
  },
};
