import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menu } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from './button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

/**
 * Slide-over navigation and utility drawer supporting all screen edges.
 */
const meta: Meta<typeof Sheet> = {
  title: 'UI/Sheet',
  component: Sheet,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const LeftDrawer: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Open mobile menu">
            <Menu className="h-4 w-4" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>
            Switch between manager views and settings.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-2 text-sm font-medium">
          <div className="px-3 py-2 rounded-md bg-muted text-primary">
            Overview
          </div>
          <div className="px-3 py-2 text-muted-foreground hover:text-primary">
            Schedule Manager
          </div>
          <div className="px-3 py-2 text-muted-foreground hover:text-primary">
            Analytics
          </div>
        </div>
        <SheetFooter>
          <SheetClose render={<Button variant="outline">Close Menu</Button>} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open mobile menu/i });
    await userEvent.click(trigger);

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/navigation menu/i),
    ).toBeInTheDocument();

    const closeButton = within(dialog).getByRole('button', {
      name: /close menu/i,
    });
    await userEvent.click(closeButton);
  },
};
