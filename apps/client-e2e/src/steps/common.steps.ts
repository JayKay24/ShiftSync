/**
 * @fileoverview Common reusable step definitions for authentication preconditions,
 * navigation, heading assertions, and shared cursor pagination.
 */

import { expect } from '@playwright/test';
import { Given, When, Then } from '../support/bdd-fixtures';

Given('{string} is logged in', async ({ world }, personaName: string) => {
  await world.fastLogin(personaName);
});

When(
  '{word} navigates to {string}',
  async ({ page }, _persona: string, path: string) => {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
  },
);

When(
  '{word} clicks the navigation link {string}',
  async ({ page }, _persona: string, linkText: string) => {
    await page.click(`text=${linkText}`);
  },
);

Then(
  'the page heading displays {string}',
  async ({ page }, heading: string) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText(heading);
  },
);
