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
  managerLocations,
} from '@shiftsync/data-access';
import * as bcrypt from 'bcryptjs';
import { addDays, setHours, setMinutes, startOfWeek, subDays, addHours } from 'date-fns';

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
  await db.delete(managerLocations);
  await db.delete(users);
  await db.delete(locations);
  await db.delete(skills);

  // 1. Seed Locations
  console.log('Seeding locations...');
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
    .returning();

  // 2. Seed Skills
  console.log('Seeding skills...');
  const seededSkills = await db
    .insert(skills)
    .values([
      { id: '22222222-2222-4222-8222-222222222221', name: 'bartender' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'line_cook' },
      { id: '22222222-2222-4222-8222-222222222223', name: 'server' },
      { id: '22222222-2222-4222-8222-222222222224', name: 'host' },
    ])
    .returning();

  // 3. Seed Users
  console.log('Seeding users...');
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
      desiredWeeklyHours: 20, // Part-time
    },
    {
      id: '33333333-3333-4333-8333-333333333335',
      email: 'frank.staff@coastaleats.com',
      passwordHash,
      firstName: 'Frank',
      lastName: 'Staff',
      role: 'Staff',
      timezone: 'America/Los_Angeles',
      desiredWeeklyHours: 45, // Full-time / Overtime prone
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
  ]).returning();

  const bob = seededUsers.find(u => u.email === 'bob.manager@coastaleats.com')!;
  const diana = seededUsers.find(u => u.email === 'diana.manager@coastaleats.com')!;
  const charlie = seededUsers.find(u => u.email === 'charlie.staff@coastaleats.com')!;
  const dave = seededUsers.find(u => u.email === 'dave.staff@coastaleats.com')!;
  const eva = seededUsers.find(u => u.email === 'eva.staff@coastaleats.com')!;
  const frank = seededUsers.find(u => u.email === 'frank.staff@coastaleats.com')!;
  const grace = seededUsers.find(u => u.email === 'grace.staff@coastaleats.com')!;
  const heidi = seededUsers.find(u => u.email === 'heidi.staff@coastaleats.com')!;

  const loc1 = seededLocs[0]; // Downtown
  const loc2 = seededLocs[1]; // Uptown
  const loc3 = seededLocs[2]; // Beach Grill
  
  // Link Managers to Locations
  console.log('Linking managers to locations...');
  await db.insert(managerLocations).values([
    { userId: bob.id, locationId: loc1.id },
    { userId: bob.id, locationId: loc2.id },
    { userId: diana.id, locationId: loc3.id },
  ]);

  const skillBartender = seededSkills.find(s => s.name === 'bartender')!;
  const skillLineCook = seededSkills.find(s => s.name === 'line_cook')!;
  const skillServer = seededSkills.find(s => s.name === 'server')!;
  const skillHost = seededSkills.find(s => s.name === 'host')!;

  // 4. Link Staff to Skills and Locations
  console.log('Linking staff to skills and certifications...');
  
  // Charlie: Bartender (Loc 1), Server (Loc 1, 2)
  await db.insert(staffSkills).values([
    { userId: charlie.id, skillId: skillBartender.id },
    { userId: charlie.id, skillId: skillServer.id }
  ]);
  await db.insert(staffCertifications).values([
    { userId: charlie.id, locationId: loc1.id },
    { userId: charlie.id, locationId: loc2.id }
  ]);

  // Dave: Line Cook (Loc 1)
  await db.insert(staffSkills).values({ userId: dave.id, skillId: skillLineCook.id });
  await db.insert(staffCertifications).values({ userId: dave.id, locationId: loc1.id });

  // Eva: Server (Loc 2)
  await db.insert(staffSkills).values({ userId: eva.id, skillId: skillServer.id });
  await db.insert(staffCertifications).values({ userId: eva.id, locationId: loc2.id });

  // Frank: Line Cook (Loc 1), Bartender (Loc 2)
  await db.insert(staffSkills).values([
    { userId: frank.id, skillId: skillLineCook.id },
    { userId: frank.id, skillId: skillBartender.id }
  ]);
  await db.insert(staffCertifications).values([
    { userId: frank.id, locationId: loc1.id },
    { userId: frank.id, locationId: loc2.id }
  ]);

  // Grace: Host, Server (Loc 3)
  await db.insert(staffSkills).values([
    { userId: grace.id, skillId: skillHost.id },
    { userId: grace.id, skillId: skillServer.id }
  ]);
  await db.insert(staffCertifications).values({ userId: grace.id, locationId: loc3.id });

  // Heidi: Bartender (Loc 3)
  await db.insert(staffSkills).values({ userId: heidi.id, skillId: skillBartender.id });
  await db.insert(staffCertifications).values({ userId: heidi.id, locationId: loc3.id });

  // 5. Seed Shifts & Assignments (Diverse scenarios)
  console.log('Seeding shifts and assignments...');
  
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // A. Normal Past Shift (Bob)
  const pastShift = await db.insert(shifts).values({
    locationId: loc1.id,
    requiredSkillId: skillBartender.id,
    startTime: setHours(setMinutes(subDays(today, 2), 0), 10),
    endTime: setHours(setMinutes(subDays(today, 2), 0), 18),
    headcountNeeded: 1,
    status: 'completed',
    createdBy: bob.id,
  }).returning().then(r => r[0]);

  await db.insert(assignments).values({
    shiftId: pastShift.id,
    userId: charlie.id,
    status: 'confirmed'
  });

  // B. Diana's shifts at Beach Grill
  const beachShift = await db.insert(shifts).values({
    locationId: loc3.id,
    requiredSkillId: skillHost.id,
    startTime: setHours(setMinutes(addDays(weekStart, 2), 0), 17),
    endTime: setHours(setMinutes(addDays(weekStart, 2), 0), 22),
    headcountNeeded: 1,
    status: 'published',
    createdBy: diana.id,
  }).returning().then(r => r[0]);

  await db.insert(assignments).values({
    shiftId: beachShift.id,
    userId: grace.id,
    status: 'confirmed'
  });

  // C. Compliance Violation Scenario: 7th Consecutive Day (Frank - loc1)
  for (let i = 0; i < 6; i++) {
    const day = addDays(weekStart, i);
    const s = await db.insert(shifts).values({
      locationId: loc1.id,
      requiredSkillId: skillLineCook.id,
      startTime: setHours(setMinutes(day, 0), 8),
      endTime: setHours(setMinutes(day, 0), 16),
      headcountNeeded: 1,
      status: 'published',
      createdBy: bob.id,
    }).returning().then(r => r[0]);

    await db.insert(assignments).values({
      shiftId: s.id,
      userId: frank.id,
      status: 'confirmed'
    });
  }

  const monday7th = addDays(weekStart, 6);
  const shift7thDay = await db.insert(shifts).values({
    locationId: loc1.id,
    requiredSkillId: skillLineCook.id,
    startTime: setHours(setMinutes(monday7th, 0), 8),
    endTime: setHours(setMinutes(monday7th, 0), 16),
    headcountNeeded: 1,
    status: 'published',
    createdBy: bob.id,
  }).returning().then(r => r[0]);

  const assignment7th = await db.insert(assignments).values({
    shiftId: shift7thDay.id,
    userId: frank.id,
    status: 'confirmed'
  }).returning().then(r => r[0]);

  await db.insert(complianceOverrides).values({
    assignmentId: assignment7th.id,
    managerId: bob.id,
    overrideType: '7th_consecutive_day',
    overrideReason: 'Critical shortage of line cooks for the holiday event.',
    createdAt: new Date(),
  });

  // D. Swap Requests (preserved logic)
  console.log('Seeding swap requests...');
  const swapShift = await db.insert(shifts).values({
    locationId: loc1.id,
    requiredSkillId: skillBartender.id,
    startTime: setHours(setMinutes(addDays(today, 5), 0), 16),
    endTime: setHours(setMinutes(addDays(today, 5), 0), 22),
    headcountNeeded: 1,
    status: 'published',
    createdBy: bob.id,
  }).returning().then(r => r[0]);

  await db.insert(assignments).values({
    shiftId: swapShift.id,
    userId: charlie.id,
    status: 'pending_swap'
  });

  await db.insert(swapRequests).values({
    requestingUserId: charlie.id,
    targetUserId: null,
    shiftId: swapShift.id,
    reason: 'Family event',
    status: 'pending_peer',
  });

  // 7. Seed Availability
  console.log('Seeding staff availability...');
  const allStaff = [charlie, dave, eva, frank, grace, heidi];
  const unavailableDays: Record<string, number> = {
    [charlie.id]: 1,
    [dave.id]: 2,
    [eva.id]: 3,
    [frank.id]: 4,
  };

  for (const user of allStaff) {
    for (let day = 0; day <= 6; day++) {
      if (unavailableDays[user.id] === day && user.id !== frank.id) continue;

      await db.insert(availability).values({
        userId: user.id,
        dayOfWeek: day,
        startTimeLocal: user.id === frank.id ? '00:00:00' : '06:00:00',
        endTimeLocal: user.id === frank.id ? '23:59:59' : '23:00:00',
        isException: false,
      });
    }
  }

  console.log('--- Seeding Completed Successfully ---');
  console.log('=========================================');
  console.log(`Admin (Alice): admin@coastaleats.com`);
  console.log(`Manager (Bob - NY): bob.manager@coastaleats.com`);
  console.log(`Manager (Diana - LA): diana.manager@coastaleats.com`);
  console.log(`Staff (Charlie): charlie.staff@coastaleats.com`);
  console.log(`Staff (Grace - Beach Grill): grace.staff@coastaleats.com`);
  console.log('Password for all: password123');
  console.log('=========================================');
  
  await pool.end();
}

function format(date: Date, fmt: string) {
  return date.toISOString().split('T')[0];
}

main().catch((err) => {
  console.error('--- Seeding Failed ---');
  console.error(err);
  process.exit(1);
});
