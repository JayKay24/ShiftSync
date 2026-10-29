import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { mockLocations, mockSkills } from '../../../../.storybook/msw-fixtures';

import { CreateShiftModal } from './create-shift-modal';

/**
 * Modal dialog for managers and admins to schedule new shifts.
 */
const meta: Meta<typeof CreateShiftModal> = {
  title: 'Features/Shifts/CreateShiftModal',
  component: CreateShiftModal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onSuccess: fn(),
    locations: mockLocations,
    skills: mockSkills,
    initialDate: new Date('2026-11-06T12:00:00.000Z'),
  },
};

export default meta;
type Story = StoryObj<typeof CreateShiftModal>;

export const DefaultOpen: Story = {};

export const SubmitShift: Story = {
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const premiumCheckbox = within(dialog).getByRole('checkbox', {
      name: /premium shift/i,
    });
    await userEvent.click(premiumCheckbox);

    const submitBtn = within(dialog).getByRole('button', {
      name: /create & publish shift/i,
    });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};
