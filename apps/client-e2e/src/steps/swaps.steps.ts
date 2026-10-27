/**
 * @fileoverview Step definitions for Shift Swap Marketplace: requesting peer swaps,
 * open market drops, peer acceptance/rejection, manager approvals, 3-request limit, and pagination.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';
import { getPersona } from '../support/personas';

When('{word} visits the Swap Marketplace', async ({ page }, _actor: string) => {
  await page.click('text=Swap Marketplace');
  await page.waitForURL(/\/dashboard\/staff\/swaps/);
});

When(
  '{word} initiates a swap request for the first available shift targeting {string} with reason {string}',
  async (
    { page },
    _persona: string,
    targetColleague: string,
    reason: string,
  ) => {
    // Wait for shifts to be loaded into dropdown
    await page.waitForFunction(
      () => {
        const select = document.querySelector(
          'select#shift',
        ) as HTMLSelectElement | null;
        return Boolean(select && select.options.length > 1);
      },
      { timeout: 15000 },
    );

    // Select the first available shift from dropdown
    await page.selectOption('select#shift', { index: 1 });

    // Select target colleague
    const target = getPersona(targetColleague);
    await page.selectOption('select#target', { value: target.id });

    // Fill reason
    await page.fill('input#reason', reason);

    // Submit
    await page.click('button:has-text("Submit Request")');
  },
);

Then(
  'the request with reason {string} appears in My Requests with status {string}',
  async ({ page }, reason: string, status: string) => {
    await expect(page.locator('h2:has-text("My Requests")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`text=${reason}`).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`text=${status}`).first()).toBeVisible();
  },
);

Then(
  'the 3-request limit banner {string} is visible',
  async ({ page }, bannerTitle: string) => {
    const banner = page.locator(`text=${bannerTitle}`).first();
    await expect(banner).toBeVisible({ timeout: 10000 });
  },
);

When(
  '{word} opens the Review Swaps modal on the schedule board',
  async ({ page }, _actor: string) => {
    await page.click('text=Schedule Manager');
    await page.waitForURL(/\/dashboard\/manager\/schedule/);

    const reviewBtn = page.locator('button:has-text("Review Swaps")').first();
    await expect(reviewBtn).toBeVisible({ timeout: 10000 });
    await reviewBtn.click();
    await expect(page.locator('text=Pending Swap Approvals')).toBeVisible();
  },
);

Then(
  'the pending swap modal displays requests awaiting approval',
  async ({ page }) => {
    const modalContent = page.locator('text=Pending Swap Approvals');
    await expect(modalContent).toBeVisible();
  },
);

When('{word} clicks "Load More Swaps"', async ({ page }, _actor: string) => {
  const loadMoreBtn = page
    .locator(
      'button:has-text("Load More Requests"), button:has-text("Load More Swaps")',
    )
    .first();
  await expect(loadMoreBtn).toBeVisible({ timeout: 15000 });
  await loadMoreBtn.click();
});

Then('additional swap request history is loaded', async ({ page }) => {
  const swapCards = page.locator('div.space-y-4 > div');
  await expect(swapCards.first()).toBeVisible();
});
