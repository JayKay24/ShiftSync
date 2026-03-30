import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from '@shiftsync/data-access';
import { seedBase } from './seeds/base';
import { seedScenarios } from './seeds/scenarios';
import { clearAll } from './seeds/clear';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  const isE2E = process.env.NODE_ENV === 'test';
  const forceFull = process.argv.includes('--full');

  console.log(`--- Seeding Started (Env: ${process.env.NODE_ENV}) ---`);

  if (forceFull || !isE2E) {
    console.log('Performing FULL seed (clearing everything)...');
    await clearAll(db);
    await seedBase(db);
    await seedScenarios(db);
  } else {
    console.log('Performing BASE seed only (preserving existing base data if possible)...');
    await seedBase(db);
  }

  console.log('--- Seeding Completed Successfully ---');
  console.log('=========================================');
  console.log(`Admin: admin@coastaleats.com`);
  console.log(`Manager (NY): bob.manager@coastaleats.com`);
  console.log(`Staff (Charlie): charlie.staff@coastaleats.com`);
  console.log('Password for all: password123');
  console.log('=========================================');
  
  await pool.end();
}

main().catch((err) => {
  console.error('--- Seeding Failed ---');
  console.error(err);
  process.exit(1);
});
