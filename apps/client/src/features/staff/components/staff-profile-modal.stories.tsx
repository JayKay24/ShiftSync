import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, userEvent, within } from 'storybook/test';

import {
  defaultMswHandlers,
  mockStaffMemberProfile,
} from '../../../../.storybook/msw-fixtures';

import { StaffProfileModal } from './staff-profile-modal';

/**
 * Modal displaying staff skills, certifications, weekly hours, and upcoming assignments.
 */
const meta: Meta<typeof StaffProfileModal> = {
  title: 'Features/Staff/StaffProfileModal',
  component: StaffProfileModal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    staff: mockStaffMemberProfile,
  },
};

export default meta;
type Story = StoryObj<typeof StaffProfileModal>;

export const OverviewAndScheduleTabs: Story = {
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    // Verify Overview content (wait for async fetch to complete)
    await expect(
      await within(dialog).findByText(/charlie staff/i),
    ).toBeInTheDocument();
    await expect(
      await within(dialog).findByText(/downtown bistro/i),
    ).toBeInTheDocument();

    // Switch to Schedule tab
    const scheduleTab = within(dialog).getByRole('button', {
      name: /schedule/i,
    });
    await userEvent.click(scheduleTab);

    await expect(
      await within(dialog).findByText(/premium/i),
    ).toBeInTheDocument();
  },
};

export const NoUpcomingShifts: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/shifts/staff/:userId/assignments', () => {
          return HttpResponse.json([]);
        }),
        ...defaultMswHandlers,
      ],
    },
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    // Wait until initial loading finishes
    await within(dialog).findByText(/charlie staff/i);

    const scheduleTab = within(dialog).getByRole('button', {
      name: /schedule/i,
    });
    await userEvent.click(scheduleTab);

    await expect(
      await within(dialog).findByText(/no upcoming shifts scheduled/i),
    ).toBeInTheDocument();
  },
};
