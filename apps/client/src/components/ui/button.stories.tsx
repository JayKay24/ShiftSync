import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';

/**
 * Interactive button component supporting variants, sizes, and keyboard focus.
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: [
        'default',
        'xs',
        'sm',
        'lg',
        'icon',
        'icon-xs',
        'icon-sm',
        'icon-lg',
      ],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Publish Schedule',
    variant: 'default',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /publish schedule/i });
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const Secondary: Story = {
  args: {
    children: 'Save Draft',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete Shift',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Export CSV',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'View Details',
    variant: 'ghost',
  },
};

export const LinkVariant: Story = {
  args: {
    children: 'View labor law rules',
    variant: 'link',
  },
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <Calendar className="h-4 w-4" />
      <span>Schedule View</span>
    </Button>
  ),
};

export const IconButton: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    'aria-label': 'Delete entry',
    children: <Trash2 className="h-4 w-4 text-destructive" />,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Locked (48h Cutoff)',
    disabled: true,
  },
};
