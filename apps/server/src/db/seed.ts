import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema, locations, skills, users, staffSkills, staffCertifications } from '@shiftsync/data-access';
import * as bcrypt from 'bcryptjs';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('--- Seeding Started ---');

  // Clear existing data
  console.log('Clearing existing data...');
  await db.delete(staffCertifications);
  await db.delete(staffSkills);
  await db.delete(users);
  await db.delete(locations);
  await db.delete(skills);

  // 1. Seed Locations
  console.log('Seeding locations...');
  const [loc1] = await db
    .insert(locations)
    .values([
      {
        name: 'Coastal Eats - Downtown',
        timezone: 'America/New_York',
        address: '123 Main St, New York, NY',
        scheduleEditCutoffHours: 48,
      },
      // ... other locations
    ])
    .returning();

  // 2. Seed Skills
  console.log('Seeding skills...');
  const [bartenderSkill] = await db
    .insert(skills)
    .values([{ name: 'bartender' }, { name: 'line_cook' }, { name: 'server' }, { name: 'host' }])
    .returning();

  // 3. Seed Initial Users
  console.log('Seeding initial users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);
  
  const [admin, manager, staff] = await db.insert(users).values([
    {
      email: 'admin@coastaleats.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'Admin',
    },
    {
      email: 'manager@coastaleats.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Manager',
      role: 'Manager',
    },
    {
      email: 'staff@coastaleats.com',
      passwordHash,
      firstName: 'Charlie',
      lastName: 'Staff',
      role: 'Staff',
      desiredWeeklyHours: 35,
    },
  ]).returning();

  // 4. Link Staff to Skills and Locations
  console.log('Linking staff to skills and certifications...');
  await db.insert(staffSkills).values({
    userId: staff.id,
    skillId: bartenderSkill.id,
  });

  await db.insert(staffCertifications).values({
    userId: staff.id,
    locationId: loc1.id,
  });

  console.log('--- Seeding Completed Successfully ---');
  console.log(`Staff User ID: ${staff.id}`);
  console.log(`Location ID: ${loc1.id}`);
  console.log(`Skill ID: ${bartenderSkill.id}`);
  await pool.end();
}

main().catch((err) => {
  console.error('--- Seeding Failed ---');
  console.error(err);
  process.exit(1);
});
