import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schemas/schema';
import { locations } from '../entities/location.entity';
import { skills } from '../entities/skill.entity';
import { users } from '../entities/user.entity';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('--- Seeding Started ---');

  // 1. Seed Locations (4 locations across 2 time zones)
  console.log('Seeding locations...');
  const seededLocations = await db
    .insert(locations)
    .values([
      {
        name: 'Coastal Eats - Downtown',
        timezone: 'America/New_York',
        address: '123 Main St, New York, NY',
        scheduleEditCutoffHours: 48,
      },
      {
        name: 'Coastal Eats - Uptown',
        timezone: 'America/New_York',
        address: '456 High St, New York, NY',
        scheduleEditCutoffHours: 48,
      },
      {
        name: 'Coastal Eats - Beachside',
        timezone: 'America/Los_Angeles',
        address: '789 Ocean Blvd, Santa Monica, CA',
        scheduleEditCutoffHours: 48,
      },
      {
        name: 'Coastal Eats - Valley',
        timezone: 'America/Los_Angeles',
        address: '101 Valley Rd, Los Angeles, CA',
        scheduleEditCutoffHours: 48,
      },
    ])
    .returning();

  // 2. Seed Skills
  console.log('Seeding skills...');
  const seededSkills = await db
    .insert(skills)
    .values([
      { name: 'bartender' },
      { name: 'line_cook' },
      { name: 'server' },
      { name: 'host' },
    ])
    .returning();

  // 3. Seed Initial Users (Admin, Manager, Staff)
  console.log('Seeding initial users...');
  // Note: Using dummy password hash for now
  const dummyHash = 'dummy_hash'; 
  
  await db.insert(users).values([
    {
      email: 'admin@coastaleats.com',
      passwordHash: dummyHash,
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'Admin',
    },
    {
      email: 'manager@coastaleats.com',
      passwordHash: dummyHash,
      firstName: 'Bob',
      lastName: 'Manager',
      role: 'Manager',
    },
    {
      email: 'staff@coastaleats.com',
      passwordHash: dummyHash,
      firstName: 'Charlie',
      lastName: 'Staff',
      role: 'Staff',
      desiredWeeklyHours: 35,
    },
  ]);

  console.log('--- Seeding Completed Successfully ---');
  await pool.end();
}

main().catch((err) => {
  console.error('--- Seeding Failed ---');
  console.error(err);
  process.exit(1);
});
