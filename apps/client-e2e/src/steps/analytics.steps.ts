/**
 * @fileoverview Step definitions for Fairness Analytics: Overall Fairness Index,
 * hours distribution, and premium shift distribution metrics.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';

When(
  '{word} visits the Analytics dashboard',
  async ({ page }, _actor: string) => {
    await page.click('text=Analytics');
    await page.waitForURL(/\/dashboard\/manager\/analytics/);
  },
);

Then(
  'the Overall Fairness Index score percentage is displayed',
  async ({ page }) => {
    const score = page.getByTestId('overall-fairness-score');
    await expect(score).toBeVisible({ timeout: 10000 });
    const scoreText = await score.innerText();
    expect(scoreText).toContain('%');
  },
);

Then(
  'the metrics card {string} is visible',
  async ({ page }, cardTitle: string) => {
    const card = page.locator(`div:has-text("${cardTitle}")`).first();
    await expect(card).toBeVisible();
  },
);

Then('the Hours Distribution chart section is displayed', async ({ page }) => {
  const section = page.locator('text=Hours Distribution').first();
  await expect(section).toBeVisible();
});
