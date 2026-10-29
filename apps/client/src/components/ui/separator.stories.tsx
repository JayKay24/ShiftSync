import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './separator';

/**
 * Visual and accessible content divider with horizontal and vertical orientation.
 */
const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <div className="text-sm font-medium">Downtown Bistro</div>
      <p className="text-xs text-muted-foreground">Active Roster</p>
      <Separator />
      <div className="text-xs text-muted-foreground">12 staff certified</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center space-x-4 text-sm">
      <span>Overview</span>
      <Separator orientation="vertical" />
      <span>Schedule</span>
      <Separator orientation="vertical" />
      <span>Analytics</span>
    </div>
  ),
};
