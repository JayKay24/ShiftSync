/**
 * @fileoverview Step definitions for Manager Overview and Staff Schedule dashboards,
 * including KPI cards, On-Duty widget, and weekly hour distribution.
 */

import { expect } from '@playwright/test';
import { Then } from '../support/bdd-fixtures';

Then(
  'the KPI summary card {string} is visible',
  async ({ page }, title: string) => {
    const cardTitle = page.locator(`div:has-text("${title}")`).first();
    await expect(cardTitle).toBeVisible();
  },
);

Then('the On-Duty staff widget is visible', async ({ page }) => {
  const widget = page.locator('text=On-Duty Now').first();
  await expect(widget).toBeVisible();
});

Then('the Weekly Hour Distribution section is displayed', async ({ page }) => {
  const section = page.locator('text=Weekly Hour Distribution').first();
  await expect(section).toBeVisible();
});

Then(
  'the user timezone badge displays {string}',
  async ({ page }, tz: string) => {
    const badge = page.locator(`div:has-text("${tz}")`).first();
    await expect(badge).toBeVisible();
  },
);

Then('the Next Shift card is displayed', async ({ page }) => {
  const nextShiftCard = page.locator('text=Next Shift').first();
  await expect(nextShiftCard).toBeVisible();
});

Then(
  'the Desired Weekly Hours progress tracker is visible',
  async ({ page }) => {
    const tracker = page.locator('text=Desired Weekly Hours').first();
    await expect(tracker).toBeVisible();
  },
);
