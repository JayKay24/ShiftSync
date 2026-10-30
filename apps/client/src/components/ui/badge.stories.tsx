import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';

/**
 * Visual status indicator badge with accessible color contrast.
 */
const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'destructive',
        'outline',
        'success',
        'warning',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Active Shift',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Server (NY)',
    variant: 'secondary',
  },
};

export const Success: Story = {
  args: {
    children: 'Fully Compliant',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Premium (1.5x)',
    variant: 'warning',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Double-Booking Conflict',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Open Shift',
    variant: 'outline',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};
