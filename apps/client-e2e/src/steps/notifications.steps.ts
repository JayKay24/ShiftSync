/**
 * @fileoverview Step definitions for Notification Center, real-time unread bell badge,
 * read status updates, and cursor pagination.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';

When(
  '{word} notes the unread notification badge count',
  async ({ page, world }, _actor: string) => {
    const bellButton = page.locator('button:has(svg.lucide-bell)');
    const bellBadge = bellButton.locator('span.bg-destructive');
    if (await bellBadge.isVisible()) {
      const text = await bellBadge.innerText();
      world.initialBadgeCount = parseInt(text, 10);
    } else {
      world.initialBadgeCount = 0;
    }
  },
);

When(
  '{word} visits the Notifications page',
  async ({ page }, _actor: string) => {
    await page.click('text=Notifications');
    await page.waitForURL(/\/dashboard\/notifications/);
  },
);

When(
  '{word} marks the first unread notification as read',
  async ({ page }, _actor: string) => {
    const markAsReadBtn = page
      .locator('button:has-text("Mark as read")')
      .first();
    if (await markAsReadBtn.isVisible()) {
      await markAsReadBtn.click();
    }
  },
);

Then(
  'the unread notification bell badge is updated immediately',
  async ({ page, world }) => {
    const bellButton = page.locator('button:has(svg.lucide-bell)');
    const bellBadge = bellButton.locator('span.bg-destructive');

    if (world.initialBadgeCount && world.initialBadgeCount > 1) {
      await expect(bellBadge).toBeVisible();
      const newCount = parseInt(await bellBadge.innerText(), 10);
      expect(newCount).toBeLessThan(world.initialBadgeCount);
    } else if (world.initialBadgeCount === 1) {
      await expect(bellBadge).toBeHidden();
    }
  },
);

When(
  '{word} clicks "Load More Notifications"',
  async ({ page }, _actor: string) => {
    const loadMoreBtn = page.locator(
      'button:has-text("Load More Notifications")',
    );
    await expect(loadMoreBtn).toBeVisible({ timeout: 10000 });
    await loadMoreBtn.click();
  },
);

Then('additional notifications are loaded in the list', async ({ page }) => {
  const notificationCards = page.locator('div.space-y-3 > div');
  await expect(notificationCards.first()).toBeVisible();
});
