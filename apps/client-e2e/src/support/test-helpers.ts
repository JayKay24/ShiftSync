import { Page } from '@playwright/test';
import { execSync } from 'child_process';

export async function login(page: Page, email: string, pass: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', pass);
  await page.click('button[type="submit"]');
  // Wait for navigation to dashboard
  await page.waitForURL(/\/dashboard/);
}

export function seedDatabase() {
  console.log('Seeding database for client e2e...');
  execSync('npm run db:seed', { stdio: 'inherit' });
}

export const TEST_USERS = {
  admin: { email: 'admin@coastaleats.com', pass: 'password123' },
  manager: { email: 'bob.manager@coastaleats.com', pass: 'password123' },
  diana: { email: 'diana.manager@coastaleats.com', pass: 'password123' },
  charlie: { email: 'charlie.staff@coastaleats.com', pass: 'password123' },
  frank: { email: 'frank.staff@coastaleats.com', pass: 'password123' },
};
