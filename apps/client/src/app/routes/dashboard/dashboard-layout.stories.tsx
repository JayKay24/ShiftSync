import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DashboardLayout } from './dashboard-layout';

/**
 * Responsive application shell layout with role-based navigation and notification badge.
 */
const meta: Meta<typeof DashboardLayout> = {
  title: 'Layout/DashboardLayout',
  component: DashboardLayout,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DashboardLayout>;

export const AdminNavigation: Story = {
  parameters: {
    appContext: {
      role: 'Admin',
      unreadCount: 5,
    },
  },
  render: () => (
    <DashboardLayout>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Admin Dashboard Content</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Full cross-location administrative oversight active.
        </p>
      </div>
    </DashboardLayout>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/admin dashboard content/i),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/audit trail/i)).toBeInTheDocument();
    await expect(canvas.getByText('5')).toBeInTheDocument();
  },
};

export const ManagerNavigation: Story = {
  parameters: {
    appContext: {
      role: 'Manager',
      unreadCount: 1,
    },
  },
  render: () => (
    <DashboardLayout>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Manager Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Managing Downtown Bistro & Uptown Lounge.
        </p>
      </div>
    </DashboardLayout>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/manager overview/i)).toBeInTheDocument();

    const userMenuButton = canvas.getByRole('button', { name: /user menu/i });
    await userEvent.click(userMenuButton);

    const menu = await within(document.body).findByRole('menu');
    await expect(menu).toBeInTheDocument();
    await expect(within(menu).getByText(/bob manager/i)).toBeInTheDocument();
    await expect(
      within(menu).getByRole('menuitem', { name: /logout/i }),
    ).toBeInTheDocument();
  },
};

export const StaffNavigation: Story = {
  parameters: {
    appContext: {
      role: 'Staff',
      unreadCount: 0,
    },
  },
  render: () => (
    <DashboardLayout>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Staff Schedule Portal</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View assigned shifts and request swaps.
        </p>
      </div>
    </DashboardLayout>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/staff schedule portal/i),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/my schedule/i)).toBeInTheDocument();
    await expect(canvas.getByText(/swap marketplace/i)).toBeInTheDocument();
  },
};

export const MobileDrawerNavigation: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    appContext: {
      role: 'Manager',
    },
  },
  render: () => (
    <DashboardLayout>
      <div className="p-4">
        <h2 className="text-base font-bold">Mobile Viewport</h2>
      </div>
    </DashboardLayout>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const menuToggle = canvas.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(menuToggle);

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/schedule manager/i),
    ).toBeInTheDocument();
  },
};
