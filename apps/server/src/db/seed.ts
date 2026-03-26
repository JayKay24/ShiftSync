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

  // 1. Seed Locations
  console.log('Seeding 4 locations...');
  const seededLocs = await db
    .insert(locations)
    .values([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Coastal Eats - Downtown',
        timezone: 'America/New_York',
        address: '123 Main St, New York, NY',
        scheduleEditCutoffHours: 48,
      },
      {
        id: '11111111-1111-4111-8111-111111111112',
        name: 'Coastal Eats - Uptown',
        timezone: 'America/New_York',
        address: '456 High St, New York, NY',
        scheduleEditCutoffHours: 48,
      },
    ])
    .returning();

  // 2. Seed Skills
  console.log('Seeding skills...');
  const seededSkills = await db
    .insert(skills)
    .values([
      { id: '22222222-2222-4222-8222-222222222221', name: 'bartender' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'line_cook' },
    ])
    .returning();

  // 3. Seed Users
  console.log('Seeding initial users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);
  
  const [admin, manager, staff] = await db.insert(users).values([
    {
      id: '33333333-3333-4333-8333-333333333330',
      email: 'admin@coastaleats.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'Admin',
    },
    {
      id: '33333333-3333-4333-8333-333333333331',
      email: 'manager@coastaleats.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Manager',
      role: 'Manager',
    },
    {
      id: '33333333-3333-4333-8333-333333333332',
      email: 'staff@coastaleats.com',
      passwordHash,
      firstName: 'Charlie',
      lastName: 'Staff',
      role: 'Staff',
      desiredWeeklyHours: 35,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'dave@coastaleats.com',
      passwordHash,
      firstName: 'Dave',
      lastName: 'Staff',
      role: 'Staff',
      desiredWeeklyHours: 40,
    },
  ]).returning();

  const bartenderSkill = seededSkills.find((s) => s.name === 'bartender')!;
  const loc1 = seededLocs[0];

  // 4. Link Staff to Skills and Locations
  console.log('Linking staff to skills and certifications...');
  
  // Charlie and Dave are Bartenders certified for Downtown
  for (const user of [staff, seededUsers[3]]) {
    await db.insert(staffSkills).values({
      userId: user.id,
      skillId: bartenderSkill.id,
    });
    await db.insert(staffCertifications).values({
      userId: user.id,
      locationId: loc1.id,
    });
  }

  console.log('--- Seeding Completed Successfully ---');
  console.log('=========================================');
  console.log(`Staff (Charlie) ID: ${staff.id}`);
  console.log(`Downtown (Loc1) ID: ${seededLocs[0].id}`);
  console.log(`Bartender Skill ID: ${bartenderSkill.id}`);
  console.log('=========================================');
  
  await pool.end();
}

main().catch((err) => {
  console.error('--- Seeding Failed ---');
  console.error(err);
  process.exit(1);
});
