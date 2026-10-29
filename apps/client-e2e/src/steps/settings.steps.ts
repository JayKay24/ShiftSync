/**
 * @fileoverview Step definitions for User Profile and Settings page, including
 * updating personal details and staff desired weekly hours targets.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';

When('{word} visits the Settings page', async ({ page }, _actor: string) => {
  await page.click('text=Settings');
  await page.waitForURL(/\/dashboard\/settings/);
});

When(
  '{word} updates desired weekly hours to {int}',
  async ({ page, world }, persona: string, hours: number) => {
    // Snapshot original before updating
    world.stateManager.snapshotProfile(persona, {
      firstName: 'Charlie',
      lastName: 'Staff',
      email: 'charlie.staff@coastaleats.com',
      desiredWeeklyHours: 35,
    });

    const dialogPromise = page
      .waitForEvent('dialog')
      .then((dialog) => dialog.accept());

    await page.fill('input#hours', String(hours));
    await page.click('button:has-text("Save Changes")');
    await dialogPromise;
  },
);

Then(
  'the desired weekly hours input reflects {int}',
  async ({ page }, hours: number) => {
    const hoursInput = page.locator('input#hours');
    await expect(hoursInput).toHaveValue(String(hours));
  },
);
