import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

/**
 * Accessible modal dialog with focus trapping and keyboard navigation.
 */
const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline">Open Confirmation Modal</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Weekly Schedule</DialogTitle>
          <DialogDescription>
            This action will publish 14 shifts across 3 locations and notify all
            assigned staff members.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">
          Shifts within 48 hours will be locked from further edits once
          published.
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button>Confirm & Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', {
      name: /open confirmation modal/i,
    });
    await userEvent.click(trigger);

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/publish weekly schedule/i),
    ).toBeInTheDocument();

    const cancelButton = within(dialog).getByRole('button', {
      name: /cancel/i,
    });
    await userEvent.click(cancelButton);
  },
};
