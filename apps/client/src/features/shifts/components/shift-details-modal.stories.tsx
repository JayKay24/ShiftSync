import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  mockCutoffShift,
  mockPastShift,
  mockStandardShift,
} from '../../../../.storybook/msw-fixtures';

import { ShiftDetailsModal } from './shift-details-modal';

/**
 * Modal displaying shift details, assigned staff, compliance warnings, and assignment workflow.
 */
const meta: Meta<typeof ShiftDetailsModal> = {
  title: 'Features/Shifts/ShiftDetailsModal',
  component: ShiftDetailsModal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onSuccess: fn(),
    shift: mockStandardShift,
  },
};

export default meta;
type Story = StoryObj<typeof ShiftDetailsModal>;

export const ManagerStandardShift: Story = {
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/shift details/i),
    ).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/assigned staff/i),
    ).toBeInTheDocument();
  },
};

export const SeventhDayOverrideRequired: Story = {
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    const overrideBadge = await within(dialog).findByText(/requires override/i);
    await expect(overrideBadge).toBeInTheDocument();

    // Click assign on David Cook to trigger compliance override requirement
    const assignButtons = within(dialog).getAllByRole('button', {
      name: /assign/i,
    });
    await userEvent.click(assignButtons[assignButtons.length - 1]);

    const reasonInput = await within(dialog).findByPlaceholderText(
      /critical staffing shortage/i,
    );
    await expect(reasonInput).toBeInTheDocument();

    await userEvent.type(reasonInput, 'Emergency banquet service');
    const confirmButton = within(dialog).getByRole('button', {
      name: /confirm/i,
    });
    await userEvent.click(confirmButton);

    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
  },
};

export const Within48HourCutoffManager: Story = {
  args: {
    shift: mockCutoffShift,
  },
  parameters: {
    appContext: {
      role: 'Manager',
    },
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    const warning = await within(dialog).findByTestId('cutoff-warning-banner');
    await expect(warning).toBeInTheDocument();
    await expect(
      within(warning).getByText(/within the 48-hour schedule lock/i),
    ).toBeInTheDocument();
  },
};

export const Within48HourCutoffAdminBypass: Story = {
  args: {
    shift: mockCutoffShift,
  },
  parameters: {
    appContext: {
      role: 'Admin',
    },
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    const warning = within(dialog).queryByTestId('cutoff-warning-banner');
    await expect(warning).not.toBeInTheDocument();
  },
};

export const PastShiftReadOnly: Story = {
  args: {
    shift: mockPastShift,
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/this shift has already passed/i),
    ).toBeInTheDocument();
  },
};
