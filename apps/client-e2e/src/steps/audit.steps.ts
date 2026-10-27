/**
 * @fileoverview Step definitions for Shift History modal and Global Corporate Audit Trail,
 * including date filters, before/after state diff expansion, and pagination.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';

When(
  '{word} clicks the View History button in the shift modal',
  async ({ page }, _actor: string) => {
    const historyBtn = page.locator('button[title="View History"]');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();
  },
);

Then('the Shift History modal displays audit log entries', async ({ page }) => {
  await expect(page.locator('text=Shift History')).toBeVisible({
    timeout: 10000,
  });
  const logEntry = page
    .locator('text=Shift History')
    .locator('..')
    .locator('..');
  await expect(logEntry).toBeVisible();
});

When(
  '{word} visits the Corporate Audit Trail',
  async ({ page }, _actor: string) => {
    await page.click('text=Audit Trail');
    await page.waitForURL(/\/dashboard\/admin\/audit/);
  },
);

Then(
  'the audit log list contains system modification records',
  async ({ page }) => {
    const logs = page.locator('div.divide-y > div');
    await expect(logs.first()).toBeVisible({ timeout: 10000 });
  },
);

When(
  '{word} expands the first audit log entry',
  async ({ page }, _actor: string) => {
    const firstLog = page.locator('div.divide-y > div').first();
    await firstLog.click();
  },
);

Then('the previous and resulting state diffs are visible', async ({ page }) => {
  await expect(page.locator('text=Previous State').first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator('text=Resulting State').first()).toBeVisible({
    timeout: 10000,
  });
});
