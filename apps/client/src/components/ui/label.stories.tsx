import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';

/**
 * Accessible form label component associated with input controls.
 */
const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    children: 'Required Skill',
    htmlFor: 'skill-select',
  },
};

export const Required: Story = {
  render: () => (
    <Label htmlFor="required-input">
      Location <span className="text-destructive">*</span>
    </Label>
  ),
};
