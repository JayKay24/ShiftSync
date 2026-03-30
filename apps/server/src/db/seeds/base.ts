import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  locations,
  skills,
  users,
  staffSkills,
  staffCertifications,
  availability,
  managerLocations,
} from '@shiftsync/data-access';
import * as bcrypt from 'bcryptjs';

export async function seedBase(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding base data (locations, skills, users)...');

  // 1. Seed Locations
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
      {
        id: '11111111-1111-4111-8111-111111111113',
        name: 'The Beach Grill',
        timezone: 'America/Los_Angeles',
        address: '789 Ocean Blvd, Santa Monica, CA',
        scheduleEditCutoffHours: 24,
      },
    ])
    .onConflictDoNothing()
    .returning();

  // 2. Seed Skills
  const seededSkills = await db
    .insert(skills)
    .values([
      { id: '22222222-2222-4222-8222-222222222221', name: 'bartender' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'line_cook' },
      { id: '22222222-2222-4222-8222-222222222223', name: 'server' },
      { id: '22222222-2222-4222-8222-222222222224', name: 'host' },
    ])
    .onConflictDoNothing()
    .returning();

  // 3. Seed Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);
  
  const seededUsers = await db.insert(users).values([
    {
      id: '33333333-3333-4333-8333-333333333330',
      email: 'admin@coastaleats.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'Admin',
      timezone: 'America/New_York',
    },
    {
      id: '33333333-3333-4333-8333-333333333331',
      email: 'bob.manager@coastaleats.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Manager',
      role: 'Manager',
      timezone: 'America/New_York',
    },
    {
      id: '33333333-3333-4333-8333-333333333336',
      email: 'diana.manager@coastaleats.com',
      passwordHash,
      firstName: 'Diana',
      lastName: 'Manager',
      role: 'Manager',
      timezone: 'America/Los_Angeles',
    },
    {
      id: '33333333-3333-4333-8333-333333333332',
      email: 'charlie.staff@coastaleats.com',
      passwordHash,
      firstName: 'Charlie',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/New_York',
      desiredWeeklyHours: 35,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'dave.staff@coastaleats.com',
      passwordHash,
      firstName: 'Dave',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/Chicago',
      desiredWeeklyHours: 40,
    },
    {
      id: '33333333-3333-4333-8333-333333333334',
      email: 'eva.staff@coastaleats.com',
      passwordHash,
      firstName: 'Eva',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/Denver',
      desiredWeeklyHours: 20,
    },
    {
      id: '33333333-3333-4333-8333-333333333335',
      email: 'frank.staff@coastaleats.com',
      passwordHash,
      firstName: 'Frank',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/Los_Angeles',
      desiredWeeklyHours: 45,
    },
    {
      id: '33333333-3333-4333-8333-333333333337',
      email: 'grace.staff@coastaleats.com',
      passwordHash,
      firstName: 'Grace',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/Los_Angeles',
      desiredWeeklyHours: 30,
    },
    {
      id: '33333333-3333-4333-8333-333333333338',
      email: 'heidi.staff@coastaleats.com',
      passwordHash,
      firstName: 'Heidi',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/Los_Angeles',
      desiredWeeklyHours: 40,
    },
  ])
  .onConflictDoNothing()
  .returning();

  // Relink IDs
  const loc1Id = '11111111-1111-4111-8111-111111111111';
  const loc2Id = '11111111-1111-4111-8111-111111111112';
  const loc3Id = '11111111-1111-4111-8111-111111111113';

  const skillBartenderId = '22222222-2222-4222-8222-222222222221';
  const skillLineCookId = '22222222-2222-4222-8222-222222222222';
  const skillServerId = '22222222-2222-4222-8222-222222222223';
  const skillHostId = '22222222-2222-4222-8222-222222222224';

  const bobId = '33333333-3333-4333-8333-333333333331';
  const dianaId = '33333333-3333-4333-8333-333333333336';
  const charlieId = '33333333-3333-4333-8333-333333333332';
  const daveId = '33333333-3333-4333-8333-333333333333';
  const evaId = '33333333-3333-4333-8333-333333333334';
  const frankId = '33333333-3333-4333-8333-333333333335';
  const graceId = '33333333-3333-4333-8333-333333333337';
  const heidiId = '33333333-3333-4333-8333-333333333338';

  // 4. Link Managers to Locations
  await db.insert(managerLocations).values([
    { userId: bobId, locationId: loc1Id },
    { userId: bobId, locationId: loc2Id },
    { userId: dianaId, locationId: loc3Id },
  ]).onConflictDoNothing();

  // 5. Link Staff to Skills and Locations
  await db.insert(staffSkills).values([
    { userId: charlieId, skillId: skillBartenderId },
    { userId: charlieId, skillId: skillServerId },
    { userId: daveId, skillId: skillLineCookId },
    { userId: evaId, skillId: skillServerId },
    { userId: frankId, skillId: skillLineCookId },
    { userId: frankId, skillId: skillBartenderId },
    { userId: graceId, skillId: skillHostId },
    { userId: graceId, skillId: skillServerId },
    { userId: heidiId, skillId: skillBartenderId },
  ]).onConflictDoNothing();

  await db.insert(staffCertifications).values([
    { userId: charlieId, locationId: loc1Id },
    { userId: charlieId, locationId: loc2Id },
    { userId: daveId, locationId: loc1Id },
    { userId: evaId, locationId: loc2Id },
    { userId: frankId, locationId: loc1Id },
    { userId: frankId, locationId: loc2Id },
    { userId: graceId, locationId: loc3Id },
    { userId: heidiId, locationId: loc3Id },
  ]).onConflictDoNothing();

  // 6. Seed Availability
  const allStaffIds = [charlieId, daveId, evaId, frankId, graceId, heidiId];
  const unavailableDays: Record<string, number> = {
    [charlieId]: 1, // Mon
    [daveId]: 2, // Tue
    [evaId]: 3, // Wed
  };

  for (const uid of allStaffIds) {
    for (let day = 0; day <= 6; day++) {
      if (unavailableDays[uid] === day && uid !== frankId) continue;

      await db.insert(availability).values({
        userId: uid,
        dayOfWeek: day,
        startTimeLocal: uid === frankId ? '00:00:00' : '06:00:00',
        endTimeLocal: uid === frankId ? '23:59:59' : '23:00:00',
        isException: false,
      }).onConflictDoNothing();
    }
  }
}
