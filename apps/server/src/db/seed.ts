import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  schema,
  locations,
  skills,
  users,
  staffSkills,
  staffCertifications,
  shifts,
  assignments,
  swapRequests,
  notifications,
  notificationSettings,
  auditLogs,
  complianceOverrides,
  timeEntries,
  availability,
} from '@shiftsync/data-access';
import * as bcrypt from 'bcryptjs';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('--- Seeding Started ---');

  // Clear existing data in correct dependency order
  console.log('Clearing existing data...');
  await db.delete(complianceOverrides);
  await db.delete(timeEntries);
  await db.delete(swapRequests);
  await db.delete(assignments);
  await db.delete(shifts);
  await db.delete(notifications);
  await db.delete(notificationSettings);
  await db.delete(auditLogs);
  await db.delete(availability);
  await db.delete(staffCertifications);
  await db.delete(staffSkills);
  await db.delete(users);
  await db.delete(locations);
  await db.delete(skills);

  // 1. Seed Locations (4 locations across 2 time zones)
  console.log('Seeding 4 locations...');
  const seededLocs = await db
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

  const [loc1, loc2, loc3, loc4] = seededLocs;

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

  const bartenderSkill = seededSkills.find((s) => s.name === 'bartender')!;
  const serverSkill = seededSkills.find((s) => s.name === 'server')!;

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
  // Charlie is a Bartender
  await db.insert(staffSkills).values({
    userId: staff.id,
    skillId: bartenderSkill.id,
  });

  // Charlie is certified ONLY for Downtown (loc1)
  await db.insert(staffCertifications).values({
    userId: staff.id,
    locationId: loc1.id,
  });

  console.log('--- Seeding Completed Successfully ---');
  console.log('=========================================');
  console.log(`Staff (Charlie) ID: ${staff.id}`);
  console.log(`Downtown (Loc1) ID: ${loc1.id}`);
  console.log(`Uptown   (Loc2) ID: ${loc2.id}`);
  console.log(`Bartender Skill ID: ${bartenderSkill.id}`);
  console.log(`Server    Skill ID: ${serverSkill.id}`);
  console.log('=========================================');
  
  await pool.end();
}

main().catch((err) => {
  console.error('--- Seeding Failed ---');
  console.error(err);
  process.exit(1);
});
