import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { defaultMswHandlers } from '../../../../.storybook/msw-fixtures';

import { PendingSwapsModal } from './pending-swaps-modal';

/**
 * Modal for managers to review, approve, or reject staff shift swap and drop requests.
 */
const meta: Meta<typeof PendingSwapsModal> = {
  title: 'Features/Swaps/PendingSwapsModal',
  component: PendingSwapsModal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onSuccess: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PendingSwapsModal>;

export const AwaitingManagerApproval: Story = {
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const approveButtons = await within(dialog).findAllByRole('button', {
      name: /approve/i,
    });
    await expect(approveButtons.length).toBeGreaterThan(0);

    await userEvent.click(approveButtons[0]);
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
  },
};

export const EmptyQueue: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/swaps', () => {
          return HttpResponse.json({
            data: [],
            nextCursor: null,
            hasMore: false,
          });
        }),
        ...defaultMswHandlers,
      ],
    },
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(
      await within(dialog).findByText(/no pending swaps requiring approval/i),
    ).toBeInTheDocument();
  },
};
