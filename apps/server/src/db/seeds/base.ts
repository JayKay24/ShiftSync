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

const LOC_DOWNTOWN = '11111111-1111-4111-8111-111111111111';
const LOC_UPTOWN = '11111111-1111-4111-8111-111111111112';
const LOC_BEACH = '11111111-1111-4111-8111-111111111113';

const SKILL_BARTENDER = '22222222-2222-4222-8222-222222222221';
const SKILL_LINE_COOK = '22222222-2222-4222-8222-222222222222';
const SKILL_SERVER = '22222222-2222-4222-8222-222222222223';
const SKILL_HOST = '22222222-2222-4222-8222-222222222224';

const ALL_SKILLS = [SKILL_BARTENDER, SKILL_LINE_COOK, SKILL_SERVER, SKILL_HOST];

/**
 * Additional staff used to demonstrate cursor-based pagination
 * (ordered by last name, then id). IDs 41-51 are NY, 52-62 are LA.
 */
export const EXTRA_STAFF = [
  // New York (certified at Downtown and/or Uptown) - last names sort after 'Staff'
  { n: 41, first: 'Kevin', last: 'Taylor', ny: true },
  { n: 42, first: 'Laura', last: 'Thomas', ny: true },
  { n: 43, first: 'Mike', last: 'Underwood', ny: true },
  { n: 44, first: 'Nina', last: 'Vance', ny: true },
  { n: 45, first: 'Oscar', last: 'Walker', ny: true },
  { n: 46, first: 'Patricia', last: 'Walsh', ny: true },
  { n: 47, first: 'Quinn', last: 'Xavier', ny: true },
  { n: 48, first: 'Rachel', last: 'Young', ny: true },
  { n: 49, first: 'Sam', last: 'Zimmerman', ny: true },
  { n: 50, first: 'Tina', last: 'Zhang', ny: true },
  { n: 51, first: 'Victor', last: 'Zhao', ny: true },
  // Los Angeles (certified at Beach Grill) - last names sort after 'Staff'
  { n: 52, first: 'Wendy', last: 'Taylor', ny: false },
  { n: 53, first: 'Xavier', last: 'Thomas', ny: false },
  { n: 54, first: 'Yara', last: 'Underwood', ny: false },
  { n: 55, first: 'Zack', last: 'Vance', ny: false },
  { n: 56, first: 'Aaron', last: 'Walker', ny: false },
  { n: 57, first: 'Bella', last: 'Walsh', ny: false },
  { n: 58, first: 'Chris', last: 'Xavier', ny: false },
  { n: 59, first: 'Donna', last: 'Young', ny: false },
  { n: 60, first: 'Ethan', last: 'Zimmerman', ny: false },
  { n: 61, first: 'Fiona', last: 'Zhang', ny: false },
  { n: 62, first: 'George', last: 'Zhao', ny: false },
].map((s) => ({
  ...s,
  id: `33333333-3333-4333-8333-3333333333${s.n}`,
  email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@coastaleats.com`,
  // Rotate skills so every role has coverage at each location.
  skills: [ALL_SKILLS[s.n % 4], ALL_SKILLS[(s.n + 1) % 4]],
}));

export const EXTRA_NY_STAFF_IDS = EXTRA_STAFF.filter((s) => s.ny).map(
  (s) => s.id,
);
export const EXTRA_LA_STAFF_IDS = EXTRA_STAFF.filter((s) => !s.ny).map(
  (s) => s.id,
);

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

  const seededUsers = await db
    .insert(users)
    .values([
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
      {
        id: '33333333-3333-4333-8333-333333333339',
        email: 'ivan.staff@coastaleats.com',
        passwordHash,
        firstName: 'Ivan',
        lastName: 'Staff',
        role: 'Staff',
        timezone: 'America/Los_Angeles',
        desiredWeeklyHours: 35,
      },
      {
        id: '33333333-3333-4333-8333-333333333340',
        email: 'judy.staff@coastaleats.com',
        passwordHash,
        firstName: 'Judy',
        lastName: 'Staff',
        role: 'Staff',
        timezone: 'America/Los_Angeles',
        desiredWeeklyHours: 35,
      },
    ])
    .onConflictDoNothing()
    .returning();

  // Extra staff to demonstrate cursor-based pagination
  await db
    .insert(users)
    .values(
      EXTRA_STAFF.map((s) => ({
        id: s.id,
        email: s.email,
        passwordHash,
        firstName: s.first,
        lastName: s.last,
        role: 'Staff' as const,
        timezone: s.ny ? 'America/New_York' : 'America/Los_Angeles',
        desiredWeeklyHours: 20 + (s.n % 5) * 5,
      })),
    )
    .onConflictDoNothing();

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
  const ivanId = '33333333-3333-4333-8333-333333333339';
  const judyId = '33333333-3333-4333-8333-333333333340';

  // 4. Link Managers to Locations
  await db
    .insert(managerLocations)
    .values([
      { userId: bobId, locationId: loc1Id },
      { userId: bobId, locationId: loc2Id },
      { userId: dianaId, locationId: loc3Id },
    ])
    .onConflictDoNothing();

  // 5. Link Staff to Skills and Locations
  await db
    .insert(staffSkills)
    .values([
      { userId: charlieId, skillId: skillBartenderId },
      { userId: charlieId, skillId: skillServerId },
      { userId: daveId, skillId: skillLineCookId },
      { userId: evaId, skillId: skillServerId },
      { userId: frankId, skillId: skillLineCookId },
      { userId: frankId, skillId: skillBartenderId },
      { userId: graceId, skillId: skillHostId },
      { userId: graceId, skillId: skillServerId },
      { userId: heidiId, skillId: skillBartenderId },
      { userId: ivanId, skillId: skillBartenderId },
      { userId: ivanId, skillId: skillServerId },
      { userId: judyId, skillId: skillServerId },
      { userId: judyId, skillId: skillHostId },
    ])
    .onConflictDoNothing();

  await db
    .insert(staffCertifications)
    .values([
      { userId: charlieId, locationId: loc1Id },
      { userId: charlieId, locationId: loc2Id },
      { userId: daveId, locationId: loc1Id },
      { userId: evaId, locationId: loc2Id },
      { userId: frankId, locationId: loc1Id },
      { userId: frankId, locationId: loc2Id },
      { userId: graceId, locationId: loc3Id },
      { userId: heidiId, locationId: loc3Id },
      { userId: ivanId, locationId: loc3Id },
      { userId: judyId, locationId: loc3Id },
    ])
    .onConflictDoNothing();

  // Extra staff (pagination demo): NY staff alternate Downtown/Uptown, with
  // every third member certified at both; LA staff are certified at Beach Grill.
  await db
    .insert(staffSkills)
    .values(
      EXTRA_STAFF.flatMap((s) =>
        s.skills.map((skillId) => ({ userId: s.id, skillId })),
      ),
    )
    .onConflictDoNothing();

  await db
    .insert(staffCertifications)
    .values(
      EXTRA_STAFF.flatMap((s) => {
        if (!s.ny) return [{ userId: s.id, locationId: LOC_BEACH }];
        if (s.n % 3 === 0) {
          return [
            { userId: s.id, locationId: LOC_DOWNTOWN },
            { userId: s.id, locationId: LOC_UPTOWN },
          ];
        }
        return [
          {
            userId: s.id,
            locationId: s.n % 2 === 0 ? LOC_DOWNTOWN : LOC_UPTOWN,
          },
        ];
      }),
    )
    .onConflictDoNothing();

  // 6. Seed Availability
  const allStaffIds = [
    charlieId,
    daveId,
    evaId,
    frankId,
    graceId,
    heidiId,
    ivanId,
    judyId,
    ...EXTRA_STAFF.map((s) => s.id),
  ];
  const unavailableDays: Record<string, number> = {
    [charlieId]: 1, // Mon
    [daveId]: 2, // Tue
    [evaId]: 3, // Wed
  };

  for (const uid of allStaffIds) {
    for (let day = 0; day <= 6; day++) {
      if (unavailableDays[uid] === day && uid !== frankId) continue;

      await db
        .insert(availability)
        .values({
          userId: uid,
          dayOfWeek: day,
          startTimeLocal: uid === frankId ? '00:00:00' : '06:00:00',
          endTimeLocal: uid === frankId ? '23:59:59' : '23:00:00',
          isException: false,
        })
        .onConflictDoNothing();
    }
  }
}
