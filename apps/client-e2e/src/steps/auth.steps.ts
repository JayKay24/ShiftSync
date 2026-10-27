/**
 * @fileoverview Step definitions for authentication flows: login form submissions,
 * credential validation errors, role-based redirects, route guards, and logout.
 */

import { expect } from '@playwright/test';
import { When, Then } from '../support/bdd-fixtures';
import { getPersona } from '../support/personas';

When('{word} visits the login page', async ({ page }, _actor: string) => {
  await page.goto('/login');
});

When(
  '{word} signs in with email {string} and password {string}',
  async ({ page }, _persona: string, email: string, pass: string) => {
    await page.fill('#email', email);
    await page.fill('#password', pass);
    await page.click('button[type="submit"]');
  },
);

When(
  '{word} logs in as {string} through the form',
  async ({ page }, _actor: string, personaName: string) => {
    const target = getPersona(personaName);
    await page.goto('/login');
    await page.fill('#email', target.email);
    await page.fill('#password', target.pass);
    await page.click('button[type="submit"]');
  },
);

Then(
  '{word} is redirected to {string}',
  async ({ page }, _persona: string, pathPattern: string) => {
    await page.waitForURL(new RegExp(pathPattern), { timeout: 15000 });
  },
);

Then(
  'an authentication error containing {string} is displayed',
  async ({ page }, message: string) => {
    const errorAlert = page.locator('.text-destructive').first();
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(message);
  },
);

When('{word} clicks the logout button', async ({ page }, _actor: string) => {
  await page.click('button:has-text("Logout")');
});
