import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clock, Users } from 'lucide-react';

import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

/**
 * Structured content container for dashboard widgets and schedule details.
 */
const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Downtown Bistro Schedule</CardTitle>
        <CardDescription>Friday, Nov 6 • 17:00 - 23:00</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>6h duration • Premium Shift (1.5x)</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>2 / 2 Staff Confirmed</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" size="sm">
          Audit Trail
        </Button>
        <Button size="sm">Manage Assignments</Button>
      </CardFooter>
    </Card>
  ),
};
