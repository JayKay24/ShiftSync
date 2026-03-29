import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from './support/test-helpers';

test.describe('ShiftSync Client E2E - Manual Test Scenarios', () => {
  
  test.describe('Scenario 1: Manager Access Control & Privacy', () => {
    test('Bob (Manager) should only see staff certified for his locations', async ({ page }) => {
      await login(page, TEST_USERS.manager.email, TEST_USERS.manager.pass);
      
      await page.click('text=Staffing');
      await page.waitForURL(/\/dashboard\/manager\/staff/);

      await expect(page.locator('text=Charlie Staff')).toBeVisible();
      await expect(page.locator('text=Dave Staff')).toBeVisible();
      
      await expect(page.locator('text=Grace Staff')).not.toBeVisible();
    });

    test('Diana (Manager) should only see her staff', async ({ page }) => {
      await login(page, TEST_USERS.diana.email, TEST_USERS.diana.pass);
      
      await page.click('text=Staffing');
      await page.waitForURL(/\/dashboard\/manager\/staff/);

      await expect(page.locator('text=Grace Staff')).toBeVisible();
      await expect(page.locator('text=Heidi Staff')).toBeVisible();
      
      await expect(page.locator('text=Charlie Staff')).not.toBeVisible();
    });
  });

  test.describe('Scenario 2: Labor Law & Past Shift Hard Blocks', () => {
    test('Should show past shift warning banner and hide suggestions', async ({ page }) => {
      await login(page, TEST_USERS.manager.email, TEST_USERS.manager.pass);
      await page.click('text=Schedule Manager');
      
      await page.click('text=Coastal Eats - Downtown');

      // Go back one week to find the past shift from seed (2 days ago)
      await page.locator('button:has(svg.lucide-chevron-left)').click();

      // Find a completed/past shift using data-testid
      const pastShiftCard = page.locator('[data-testid="shift-card"][data-status="completed"]').first();
      await expect(pastShiftCard).toBeVisible({ timeout: 15000 });
      await pastShiftCard.click();

      await expect(page.locator('text=This shift has already passed')).toBeVisible();
      await expect(page.locator('text=Suggested Staff')).not.toBeVisible();
    });

    test('Should show 48h schedule lock warning for near-future shifts', async ({ page }) => {
      await login(page, TEST_USERS.manager.email, TEST_USERS.manager.pass);
      await page.click('text=Schedule Manager');

      await page.click('text=Coastal Eats - Downtown');

      await page.getByTestId('create-shift-button').click();
      await page.getByTestId('submit-shift-button').click();

      await expect(page.getByTestId('submit-shift-button')).not.toBeVisible();
      
      const publishedShift = page.locator('[data-testid="shift-card"][data-status="published"]').first();
      await expect(publishedShift).toBeVisible({ timeout: 15000 });
      await publishedShift.click();

      await expect(page.locator('text=This shift is within the 48-hour schedule lock')).toBeVisible();
    });
  });

  test.describe('Scenario 5: 48-Hour Edit Cutoff (Manager vs Admin)', () => {
    test('Admin (Alice) should NOT see the 48h warning banner', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.pass);
      await page.click('text=Schedule Manager');

      await page.click('text=Coastal Eats - Downtown');

      // Ensure a shift exists
      const shift = page.locator('[data-testid="shift-card"][data-status="published"]').first();
      await expect(shift).toBeVisible({ timeout: 15000 });
      await shift.click();

      await expect(page.locator('text=This shift is within the 48-hour schedule lock')).not.toBeVisible();
    });
  });

  test.describe('Scenario 6: Notification Sync', () => {
    test('Marking notification as read should update bell icon instantly', async ({ page }) => {
      await login(page, TEST_USERS.charlie.email, TEST_USERS.charlie.pass);
      
      const bellButton = page.locator('button:has(svg.lucide-bell)');
      const bellBadge = bellButton.locator('span.bg-destructive');
      
      // Wait for badge or confirm it's 0
      const initialVisible = await bellBadge.isVisible();
      const initialCount = initialVisible ? await bellBadge.innerText() : '0';

      await page.click('text=Notifications');
      await page.waitForURL(/\/dashboard\/notifications/);

      const markAsReadBtn = page.locator('button:has-text("Mark as read")').first();
      if (await markAsReadBtn.isVisible()) {
        await markAsReadBtn.click();
        
        if (initialCount === '1') {
          await expect(bellBadge).not.toBeVisible();
        } else if (initialVisible) {
          const newCount = await bellBadge.innerText();
          expect(Number(newCount)).toBeLessThan(Number(initialCount));
        }
      }
    });
  });
});
