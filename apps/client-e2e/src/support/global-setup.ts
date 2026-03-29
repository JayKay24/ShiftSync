import { FullConfig } from '@playwright/test';
import { seedDatabase } from './test-helpers';

async function globalSetup(config: FullConfig) {
  console.log('\nGlobal Setup: Seeding database...');
  seedDatabase();
}

export default globalSetup;
