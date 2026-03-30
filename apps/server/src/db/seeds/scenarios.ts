import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  shifts,
  assignments,
  swapRequests,
  complianceOverrides,
} from '@shiftsync/data-access';
import { addDays, setHours, setMinutes, startOfWeek, subDays } from 'date-fns';

export async function seedScenarios(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding manual testing scenarios...');

  const loc1Id = '11111111-1111-4111-8111-111111111111'; // Downtown
  const loc3Id = '11111111-1111-4111-8111-111111111113'; // Beach Grill

  const skillBartenderId = '22222222-2222-4222-8222-222222222221';
  const skillLineCookId = '22222222-2222-4222-8222-222222222222';
  const skillHostId = '22222222-2222-4222-8222-222222222224';

  const bobId = '33333333-3333-4333-8333-333333333331';
  const dianaId = '33333333-3333-4333-8333-333333333336';
  const charlieId = '33333333-3333-4333-8333-333333333332';
  const frankId = '33333333-3333-4333-8333-333333333335';
  const graceId = '33333333-3333-4333-8333-333333333337';

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // A. Past Completed Shift
  const pastShift = await db.insert(shifts).values({
    locationId: loc1Id,
    requiredSkillId: skillBartenderId,
    startTime: setHours(setMinutes(subDays(today, 2), 0), 10),
    endTime: setHours(setMinutes(subDays(today, 2), 0), 18),
    headcountNeeded: 1,
    status: 'completed',
    createdBy: bobId,
  }).returning().then(r => r[0]);

  await db.insert(assignments).values({
    shiftId: pastShift.id,
    userId: charlieId,
    status: 'confirmed'
  });

  // B. Active Published Shift (Beach Grill)
  const beachShift = await db.insert(shifts).values({
    locationId: loc3Id,
    requiredSkillId: skillHostId,
    startTime: setHours(setMinutes(addDays(weekStart, 2), 0), 17),
    endTime: setHours(setMinutes(addDays(weekStart, 2), 0), 22),
    headcountNeeded: 1,
    status: 'published',
    createdBy: dianaId,
  }).returning().then(r => r[0]);

  await db.insert(assignments).values({
    shiftId: beachShift.id,
    userId: graceId,
    status: 'confirmed'
  });

  // C. 7th Consecutive Day Scenario (Frank)
  for (let i = 0; i < 6; i++) {
    const day = addDays(weekStart, i);
    const s = await db.insert(shifts).values({
      locationId: loc1Id,
      requiredSkillId: skillLineCookId,
      startTime: setHours(setMinutes(day, 0), 8),
      endTime: setHours(setMinutes(day, 0), 16),
      headcountNeeded: 1,
      status: 'published',
      createdBy: bobId,
    }).returning().then(r => r[0]);

    await db.insert(assignments).values({
      shiftId: s.id,
      userId: frankId,
      status: 'confirmed'
    });
  }

  const monday7th = addDays(weekStart, 6);
  const shift7thDay = await db.insert(shifts).values({
    locationId: loc1Id,
    requiredSkillId: skillLineCookId,
    startTime: setHours(setMinutes(monday7th, 0), 8),
    endTime: setHours(setMinutes(monday7th, 0), 16),
    headcountNeeded: 1,
    status: 'published',
    createdBy: bobId,
  }).returning().then(r => r[0]);

  const assignment7th = await db.insert(assignments).values({
    shiftId: shift7thDay.id,
    userId: frankId,
    status: 'confirmed'
  }).returning().then(r => r[0]);

  await db.insert(complianceOverrides).values({
    assignmentId: assignment7th.id,
    managerId: bobId,
    overrideType: '7th_consecutive_day',
    overrideReason: 'Critical shortage of line cooks for the holiday event.',
    createdAt: new Date(),
  });

  // D. Pending Swap Request
  const swapShift = await db.insert(shifts).values({
    locationId: loc1Id,
    requiredSkillId: skillBartenderId,
    startTime: setHours(setMinutes(addDays(today, 1), 0), 16),
    endTime: setHours(setMinutes(addDays(today, 1), 0), 22),
    headcountNeeded: 1,
    status: 'published',
    createdBy: bobId,
  }).returning().then(r => r[0]);

  await db.insert(assignments).values({
    shiftId: swapShift.id,
    userId: charlieId,
    status: 'pending_swap'
  });

  await db.insert(swapRequests).values({
    requestingUserId: charlieId,
    targetUserId: null,
    shiftId: swapShift.id,
    reason: 'Family event',
    status: 'pending_peer',
  });
}
