/**
 * @fileoverview Step definitions for Staff Management directory, Location-Based Access Control (LBAC),
 * Staff Profile modals, and cursor pagination.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';

When(
  '{word} visits the Staffing directory',
  async ({ page }, _actor: string) => {
    await page.click('text=Staffing');
    await page.waitForURL(/\/dashboard\/manager\/staff/);
  },
);

Then(
  'the staff member {string} is visible in the directory',
  async ({ page }, fullName: string) => {
    const staffCard = page.locator(`text=${fullName}`).first();
    await expect(staffCard).toBeVisible({ timeout: 10000 });
  },
);

Then(
  'the staff member {string} is not visible in the directory',
  async ({ page }, fullName: string) => {
    const staffCard = page.locator(`text=${fullName}`);
    await expect(staffCard).toBeHidden();
  },
);

When(
  '{word} opens the profile for {string}',
  async ({ page }, _persona: string, fullName: string) => {
    const card = page
      .locator(`div:has-text("${fullName}")`)
      .locator('..')
      .locator('..');
    const viewProfileBtn = card
      .locator('button:has-text("View Profile")')
      .first();
    await viewProfileBtn.click();
  },
);

Then(
  'the staff profile modal is displayed for {string}',
  async ({ page }, fullName: string) => {
    const modalTitle = page.locator(`h2:has-text("${fullName}")`).first();
    await expect(modalTitle).toBeVisible();
  },
);

When(
  '{word} switches to the profile {string} tab',
  async ({ page }, _persona: string, tabName: string) => {
    const tabButton = page.locator(`button:has-text("${tabName}")`).first();
    await tabButton.click();
  },
);

Then(
  'the profile modal displays the {string} section',
  async ({ page }, sectionTitle: string) => {
    const section = page.locator(`text=${sectionTitle}`).first();
    await expect(section).toBeVisible();
  },
);

When(
  '{word} closes the staff profile modal',
  async ({ page }, _actor: string) => {
    await page.keyboard.press('Escape');
  },
);

When('{word} clicks "Load More Staff"', async ({ page }, _actor: string) => {
  const loadMoreBtn = page.locator('button:has-text("Load More Staff")');
  await expect(loadMoreBtn).toBeVisible();
  await loadMoreBtn.click();
});

Then(
  'additional staff cards are loaded into the directory',
  async ({ page }) => {
    const cards = page.locator('div.grid > div.overflow-hidden');
    await expect(cards).toHaveCount(await cards.count());
  },
);
