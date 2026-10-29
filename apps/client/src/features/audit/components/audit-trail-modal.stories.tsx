import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, within } from 'storybook/test';

import { AuditTrailModal } from './audit-trail-modal';

/**
 * Modal displaying chronological audit log diffs for schedule entities.
 */
const meta: Meta<typeof AuditTrailModal> = {
  title: 'Features/Audit/AuditTrailModal',
  component: AuditTrailModal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    entityType: 'shift',
    entityId: 'shift-101',
    title: 'Shift Audit History',
  },
};

export default meta;
type Story = StoryObj<typeof AuditTrailModal>;

export const ChronologicalDiffHistory: Story = {
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/shift audit history/i),
    ).toBeInTheDocument();
    await expect(
      await within(dialog).findByText(/bob manager/i),
    ).toBeInTheDocument();
  },
};

export const EmptyHistory: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/audit/entity/:type/:id', () => {
          return HttpResponse.json({
            data: [],
            nextCursor: null,
            hasMore: false,
          });
        }),
      ],
    },
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(
      await within(dialog).findByText(/no history found for this item/i),
    ).toBeInTheDocument();
  },
};
