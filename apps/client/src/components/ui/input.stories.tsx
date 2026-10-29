import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Input } from './input';
import { Label } from './label';

/**
 * Text and numeric input field with validation and disabled states.
 */
const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter reason for override...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText(/enter reason for override/i);
    await userEvent.type(input, 'Critical staffing shortage');
    await expect(input).toHaveValue('Critical staffing shortage');
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="shift-date">Shift Date</Label>
      <Input id="shift-date" type="date" defaultValue="2026-11-06" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Locked schedule value',
  },
};

export const Invalid: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="hours-cap">Daily Hours Cap</Label>
      <Input
        id="hours-cap"
        type="number"
        defaultValue={14}
        aria-invalid="true"
      />
      <p className="text-xs text-destructive">
        Daily cap cannot exceed 12 hours under labor law compliance.
      </p>
    </div>
  ),
};
