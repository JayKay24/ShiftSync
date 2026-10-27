/**
 * @fileoverview Step definitions for past shift lock, 48-hour schedule lock warning banner,
 * Admin cutoff bypass, and labor law compliance override workflows.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';

When(
  '{word} opens a completed shift at {string} from the previous week',
  async ({ page }, _persona: string, locationName: string) => {
    await page.click('text=Schedule Manager');
    await page.waitForURL(/\/dashboard\/manager\/schedule/);
    await page.click(`button:has-text("${locationName}")`);

    // Navigate to previous week where seed placed completed shift
    await page.locator('button:has(svg.lucide-chevron-left)').click();

    const pastShiftCard = page
      .locator('[data-testid="shift-card"][data-status="completed"]')
      .first();
    await expect(pastShiftCard).toBeVisible({ timeout: 15000 });
    await pastShiftCard.click();
  },
);

Then('he sees the notice {string}', async ({ page }, notice: string) => {
  await expect(page.locator(`text=${notice}`).first()).toBeVisible({
    timeout: 10000,
  });
});

Then('the Suggested Staff list is hidden', async ({ page }) => {
  await expect(page.locator('text=Suggested Staff')).toBeHidden();
});

Then('he sees the 48-hour schedule lock warning banner', async ({ page }) => {
  const banner = page.getByTestId('cutoff-warning-banner');
  await expect(banner).toBeVisible({ timeout: 15000 });
});

Then(
  'she does not see the 48-hour schedule lock warning banner',
  async ({ page }) => {
    const banner = page.getByTestId('cutoff-warning-banner');
    await expect(banner).toBeHidden();
  },
);

When(
  '{word} attempts to assign a staff member that requires an override',
  async ({ page }, _actor: string) => {
    // Click assign on staff requiring override
    const assignBtn = page.locator('button:has-text("Assign")').first();
    await assignBtn.click();
  },
);

Then('the compliance override reason prompt is displayed', async ({ page }) => {
  const overridePrompt = page.locator('text=Override Required');
  await expect(overridePrompt).toBeVisible({ timeout: 10000 });
});

When(
  '{word} enters override reason {string} and confirms assignment',
  async ({ page }, _persona: string, reason: string) => {
    await page.fill('input#reason', reason);
    const assignBtn = page.locator('button:has-text("Assign")').first();
    await assignBtn.click();
  },
);
