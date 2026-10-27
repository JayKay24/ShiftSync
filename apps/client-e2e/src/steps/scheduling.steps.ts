/**
 * @fileoverview Step definitions for schedule manager, shift creation, calendar navigation,
 * location filters, premium badges, and staff assignment.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../support/bdd-fixtures';
import { createShiftViaApi } from '../support/api-fixtures';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

Given(
  'a published {string} shift exists at {string} tomorrow at {string}',
  async (
    { world },
    skillName: string,
    locationName: string,
    startTimeStr: string,
  ) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, mins] = startTimeStr.split(':').map(Number);
    tomorrow.setHours(hours, mins, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(endTime.getHours() + 6);

    const shift = await createShiftViaApi(
      'Bob',
      {
        locationName,
        skillName,
        startTime: tomorrow,
        endTime,
        headcountNeeded: 99,
        status: 'published',
      },
      world.stateManager,
    );
    world.activeShift = shift;
  },
);

When('{word} visits the Schedule Manager', async ({ page }, _actor: string) => {
  await page.click('text=Schedule Manager');
  await page.waitForURL(/\/dashboard\/manager\/schedule/);
});

When(
  '{word} filters the schedule by location {string}',
  async ({ page }, _persona: string, locationName: string) => {
    await page.click(`button:has-text("${locationName}")`);
  },
);

When(
  '{word} creates a new shift at {string} for {int} days from now from {string} to {string} with headcount {int}',
  async (
    { page },
    _persona: string,
    _locationName: string,
    daysAhead: number,
    startTime: string,
    endTime: string,
    headcount: number,
  ) => {
    await page.getByTestId('create-shift-button').click();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const dateStr = formatLocalDate(targetDate);

    await page.fill('input[type="date"]', dateStr);
    await page.fill('input#startTime', startTime);
    await page.fill('input#endTime', endTime);
    await page.fill('input#headcount', String(headcount));

    await page.getByTestId('submit-shift-button').click();
    await expect(page.getByTestId('submit-shift-button')).not.toBeVisible({
      timeout: 10000,
    });
  },
);

Then(
  'a shift card with headcount {int} is displayed on the schedule grid',
  async ({ page }, headcount: number) => {
    const shiftCard = page
      .locator(`[data-testid="shift-card"][data-headcount="${headcount}"]`)
      .first();
    await expect(shiftCard).toBeVisible({ timeout: 15000 });
  },
);

When(
  '{word} opens the shift with headcount {int}',
  async ({ page }, _persona: string, headcount: number) => {
    const shiftCard = page
      .locator(`[data-testid="shift-card"][data-headcount="${headcount}"]`)
      .first();
    await shiftCard.click();
    await expect(page.locator('text=Shift Details')).toBeVisible();
  },
);

When(
  '{word} opens that shift on the Schedule Manager board',
  async ({ page, world }, _actor: string) => {
    await page.click('text=Schedule Manager');
    await page.waitForURL(/\/dashboard\/manager\/schedule/);

    // Filter to Downtown
    await page.click('button:has-text("Coastal Eats - Downtown")');

    // Find shift card matching the created headcount
    const headcount = (world.activeShift?.headcountNeeded as number) || 99;
    const shiftCard = page
      .locator(`[data-testid="shift-card"][data-headcount="${headcount}"]`)
      .first();
    await expect(shiftCard).toBeVisible({ timeout: 15000 });
    await shiftCard.click();
  },
);

Then(
  'the Shift Details modal shows {string}',
  async ({ page }, text: string) => {
    await expect(page.locator(`text=${text}`).first()).toBeVisible();
  },
);

When(
  '{word} navigates to the previous week on the calendar',
  async ({ page }, _actor: string) => {
    await page.locator('button:has(svg.lucide-chevron-left)').click();
  },
);

When(
  '{word} navigates to the next week on the calendar',
  async ({ page }, _actor: string) => {
    await page.locator('button:has(svg.lucide-chevron-right)').click();
  },
);

When(
  '{word} assigns the first suggested staff member',
  async ({ page }, _actor: string) => {
    const assignButton = page.locator('button:has-text("Assign")').first();
    await expect(assignButton).toBeVisible({ timeout: 10000 });
    await assignButton.click();
  },
);

Then('the staff member is listed under Assigned Staff', async ({ page }) => {
  const assignedList = page.locator('h3:has-text("Assigned Staff") + div');
  await expect(assignedList).toBeVisible();
});
