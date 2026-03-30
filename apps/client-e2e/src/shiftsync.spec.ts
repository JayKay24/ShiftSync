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
      
      // Set date to tomorrow to ensure it's in future but within 48h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateStr);
      await page.fill('input[id="startTime"]', '11:00');
      await page.fill('input[id="headcount"]', '99');

      await page.getByTestId('submit-shift-button').click();

      await expect(page.getByTestId('submit-shift-button')).not.toBeVisible();
      
      // Select the shift by the unique headcount
      const publishedShift = page.locator('[data-testid="shift-card"][data-status="published"][data-headcount="99"]').first();
      await expect(publishedShift).toBeVisible({ timeout: 15000 });
      await publishedShift.click();

      await expect(page.getByTestId('cutoff-warning-banner')).toBeVisible();
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

      await expect(page.getByTestId('cutoff-warning-banner')).not.toBeVisible();
    });
  });

  test.describe('Scenario 7: Audit Trail & Transparency', () => {
    test('Admin should be able to view shift history via Audit Trail', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.pass);
      await page.click('text=Schedule Manager');
      await page.click('text=Coastal Eats - Downtown');

      // Create a NEW shift to ensure it has a "Created" log entry
      await page.getByTestId('create-shift-button').click();
      
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const dateStr = future.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateStr);
      await page.fill('input[id="startTime"]', '10:00');
      await page.fill('input[id="headcount"]', '77'); // Unique headcount for selection

      await page.getByTestId('submit-shift-button').click();
      await expect(page.getByTestId('submit-shift-button')).not.toBeVisible();

      // Click the newly created shift
      const newShift = page.locator('[data-testid="shift-card"][data-headcount="77"]').first();
      await expect(newShift).toBeVisible({ timeout: 15000 });
      await newShift.click();

      // Click the History (Clock/History icon) button
      const historyBtn = page.locator('button[title="View History"]');
      await expect(historyBtn).toBeVisible();
      await historyBtn.click();

      // Verify the Audit Trail modal appears
      await expect(page.locator('text=Shift History')).toBeVisible();
      
      // Wait for logs to load and find "Created" text
      const createdLog = page.locator('text=Created').first();
      await expect(createdLog).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Alice Admin')).toBeVisible();
    });
  });

  test.describe('Scenario 8: Fairness & Analytics', () => {
    test('Manager should be able to view Fairness Index and Premium distribution', async ({ page }) => {
      await login(page, TEST_USERS.manager.email, TEST_USERS.manager.pass);
      
      await page.click('text=Fairness & Premium Metrics');
      await page.waitForURL(/\/dashboard\/manager\/analytics/);

      await expect(page.locator('text=Overall Fairness Index')).toBeVisible();
      const score = page.getByTestId('overall-fairness-score');
      await expect(score).toBeVisible();
      
      // Should show a percentage (e.g. 100% or less)
      const scoreText = await score.innerText();
      expect(scoreText).toContain('%');
      
      await expect(page.locator('h3:has-text("Premium Shift Distribution")')).toBeVisible();
    });
  });

  test.describe('Scenario 9: Shift Swapping (Staff Flow)', () => {
    test('Charlie should be able to initiate a swap request', async ({ page }) => {
      await login(page, TEST_USERS.charlie.email, TEST_USERS.charlie.pass);
      
      const staffPromise = page.waitForResponse(r => r.url().includes('/staff') && r.status() === 200);
      const asgnPromise = page.waitForResponse(r => r.url().includes('/my-assignments') && r.status() === 200);
      
      await page.click('text=Request Swap');
      await page.waitForURL(/\/dashboard\/staff\/swaps/);
      
      await Promise.all([staffPromise, asgnPromise]);

      // Wait a bit more for React to render the options
      await page.waitForTimeout(1000);

      // Select the first available shift from the dropdown (seeded)
      await page.selectOption('select#shift', { index: 1 });
      
      // Select a target peer (Dave)
      const targetSelect = page.locator('select#target');
      await expect(targetSelect).toBeVisible();
      
      // Dave's ID from base.ts seed: 33333333-3333-4333-8333-333333333333
      await page.selectOption('select#target', { value: '33333333-3333-4333-8333-333333333333' });
      
      // Enter reason
      await page.fill('input#reason', 'Family event swap');
      
      // Submit
      await page.click('button:has-text("Submit Request")');

      // Verify it appears in "My Requests"
      await expect(page.locator('h2:has-text("My Requests")')).toBeVisible();
      await expect(page.locator('text=Family event swap')).toBeVisible();
      await expect(page.locator('text=pending peer').first()).toBeVisible();
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
