import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  shifts,
  assignments,
  swapRequests,
  complianceOverrides,
  notifications,
  auditLogs,
} from '@shiftsync/data-access';
import {
  addDays,
  addHours,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
  subDays,
  subHours,
} from 'date-fns';
import { EXTRA_STAFF } from './base';

type NotificationType = (typeof notifications.$inferInsert)['type'];

const at = (day: Date, hour: number) => setHours(setMinutes(day, 0), hour);

export async function seedScenarios(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding manual testing scenarios...');

  const loc1Id = '11111111-1111-4111-8111-111111111111'; // Downtown
  const loc2Id = '11111111-1111-4111-8111-111111111112'; // Uptown
  const loc3Id = '11111111-1111-4111-8111-111111111113'; // Beach Grill

  const skillBartenderId = '22222222-2222-4222-8222-222222222221';
  const skillLineCookId = '22222222-2222-4222-8222-222222222222';
  const skillHostId = '22222222-2222-4222-8222-222222222224';

  const aliceId = '33333333-3333-4333-8333-333333333330';
  const bobId = '33333333-3333-4333-8333-333333333331';
  const charlieId = '33333333-3333-4333-8333-333333333332';
  const frankId = '33333333-3333-4333-8333-333333333335';
  const dianaId = '33333333-3333-4333-8333-333333333336';
  const graceId = '33333333-3333-4333-8333-333333333337';

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // A. Past Completed Shift (guaranteed to be in the previous week regardless of run day)
  const pastShift = await db
    .insert(shifts)
    .values({
      locationId: loc1Id,
      requiredSkillId: skillBartenderId,
      startTime: setHours(setMinutes(subDays(weekStart, 2), 0), 10),
      endTime: setHours(setMinutes(subDays(weekStart, 2), 0), 18),
      headcountNeeded: 1,
      status: 'completed',
      createdBy: bobId,
    })
    .returning()
    .then((r) => r[0]);

  await db.insert(assignments).values({
    shiftId: pastShift.id,
    userId: charlieId,
    status: 'confirmed',
  });

  // B. Active Published Shift (Beach Grill)
  const beachShift = await db
    .insert(shifts)
    .values({
      locationId: loc3Id,
      requiredSkillId: skillHostId,
      startTime: setHours(setMinutes(addDays(weekStart, 2), 0), 17),
      endTime: setHours(setMinutes(addDays(weekStart, 2), 0), 22),
      headcountNeeded: 1,
      status: 'published',
      createdBy: dianaId,
    })
    .returning()
    .then((r) => r[0]);

  await db.insert(assignments).values({
    shiftId: beachShift.id,
    userId: graceId,
    status: 'confirmed',
  });

  // C. 7th Consecutive Day Scenario (Frank)
  for (let i = 0; i < 6; i++) {
    const day = addDays(weekStart, i);
    const s = await db
      .insert(shifts)
      .values({
        locationId: loc1Id,
        requiredSkillId: skillLineCookId,
        startTime: setHours(setMinutes(day, 0), 8),
        endTime: setHours(setMinutes(day, 0), 16),
        headcountNeeded: 1,
        status: 'published',
        createdBy: bobId,
      })
      .returning()
      .then((r) => r[0]);

    await db.insert(assignments).values({
      shiftId: s.id,
      userId: frankId,
      status: 'confirmed',
    });
  }

  const monday7th = addDays(weekStart, 6);
  const shift7thDay = await db
    .insert(shifts)
    .values({
      locationId: loc1Id,
      requiredSkillId: skillLineCookId,
      startTime: setHours(setMinutes(monday7th, 0), 8),
      endTime: setHours(setMinutes(monday7th, 0), 16),
      headcountNeeded: 1,
      status: 'published',
      createdBy: bobId,
    })
    .returning()
    .then((r) => r[0]);

  const assignment7th = await db
    .insert(assignments)
    .values({
      shiftId: shift7thDay.id,
      userId: frankId,
      status: 'confirmed',
    })
    .returning()
    .then((r) => r[0]);

  await db.insert(complianceOverrides).values({
    assignmentId: assignment7th.id,
    managerId: bobId,
    overrideType: '7th_consecutive_day',
    overrideReason: 'Critical shortage of line cooks for the holiday event.',
    createdAt: new Date(),
  });

  // D. Pending Swap Request
  const swapShift = await db
    .insert(shifts)
    .values({
      locationId: loc1Id,
      requiredSkillId: skillBartenderId,
      startTime: setHours(setMinutes(addDays(today, 1), 0), 16),
      endTime: setHours(setMinutes(addDays(today, 1), 0), 22),
      headcountNeeded: 1,
      status: 'published',
      createdBy: bobId,
    })
    .returning()
    .then((r) => r[0]);

  await db.insert(assignments).values({
    shiftId: swapShift.id,
    userId: charlieId,
    status: 'pending_swap',
  });

  await db.insert(swapRequests).values({
    requestingUserId: charlieId,
    targetUserId: null,
    shiftId: swapShift.id,
    reason: 'Family event',
    status: 'pending_peer',
  });

  // E. Pagination Scenarios (Integrated Bulk Seed Data)
  console.log('Seeding pagination demo data across all list domains...');

  const now = new Date();
  const dayBase = startOfDay(now);
  const nyStaff = EXTRA_STAFF.filter((s) => s.ny);
  const laStaff = EXTRA_STAFF.filter((s) => !s.ny);

  // 1. Regular schedule: 3 shifts/day at NY locations for 12 days (36 shifts)
  const slots = [
    { start: 8, end: 14 },
    { start: 12, end: 18 },
    { start: 16, end: 22 },
  ];
  const nyShiftRows: (typeof shifts.$inferInsert)[] = [];
  const nyShiftStaff: (typeof nyStaff)[number][] = [];
  let slotIdx = 0;
  for (let d = 3; d < 15; d++) {
    for (const slot of slots) {
      const staff = nyStaff[slotIdx % nyStaff.length];
      nyShiftRows.push({
        locationId: slotIdx % 2 === 0 ? loc1Id : loc2Id,
        requiredSkillId: staff.skills[0],
        startTime: at(addDays(dayBase, d), slot.start),
        endTime: at(addDays(dayBase, d), slot.end),
        headcountNeeded: 1,
        status: 'published',
        createdBy: bobId,
      });
      nyShiftStaff.push(staff);
      slotIdx++;
    }
  }
  const nyShifts = await db.insert(shifts).values(nyShiftRows).returning();
  await db.insert(assignments).values(
    nyShifts.map((s, idx) => ({
      shiftId: s.id,
      userId: nyShiftStaff[idx].id,
      status: 'confirmed' as const,
    })),
  );

  // 2. Beach Grill schedule: 2 shifts/day for 6 days (12 shifts)
  const laShiftRows: (typeof shifts.$inferInsert)[] = [];
  const laShiftStaff: (typeof laStaff)[number][] = [];
  slotIdx = 0;
  for (let d = 3; d < 9; d++) {
    for (const slot of [slots[1], slots[2]]) {
      const staff = laStaff[slotIdx % laStaff.length];
      laShiftRows.push({
        locationId: loc3Id,
        requiredSkillId: staff.skills[0],
        startTime: at(addDays(dayBase, d), slot.start),
        endTime: at(addDays(dayBase, d), slot.end),
        headcountNeeded: 1,
        status: 'published',
        createdBy: dianaId,
      });
      laShiftStaff.push(staff);
      slotIdx++;
    }
  }
  const laShifts = await db.insert(shifts).values(laShiftRows).returning();
  await db.insert(assignments).values(
    laShifts.map((s, idx) => ({
      shiftId: s.id,
      userId: laShiftStaff[idx].id,
      status: 'confirmed' as const,
    })),
  );

  // 3. Swap Requests:
  // Charlie's swaps:
  // - Scenario D already gave Charlie 1 outgoing 'pending_peer' request.
  // - Give Charlie 1 outgoing 'pending_manager' request -> Total 2 active pending requests (strictly <= 3, respecting Requirement #3).
  // - Give Charlie 4 incoming 'pending_peer' requests from NY colleagues targeting Charlie -> Populates "Requests for You".
  // - Give Charlie 10 historical resolved requests (4 approved, 3 rejected, 3 cancelled) -> Total 16 swap records (> 10 = 2 pages).
  // Bob's manager approvals:
  // - 1 from Charlie (pending_manager) + 12 from other NY staff (pending_manager) = 13 total awaiting Bob's approval (> 10 = 2 pages).
  const charlieShiftRows: (typeof shifts.$inferInsert)[] = [];
  for (let d = 15; d < 30; d++) {
    charlieShiftRows.push({
      locationId: loc1Id,
      requiredSkillId: skillBartenderId,
      startTime: at(addDays(dayBase, d), 10),
      endTime: at(addDays(dayBase, d), 14),
      headcountNeeded: 1,
      status: 'published',
      createdBy: bobId,
    });
  }
  const charlieShifts = await db
    .insert(shifts)
    .values(charlieShiftRows)
    .returning();

  const reasons = [
    'Family event',
    'Doctor appointment',
    'Class conflict',
    'Out of town',
    'Childcare fell through',
    'Car trouble',
    'Personal obligation',
  ];

  // 3a. Charlie's single pending_manager request
  await db.insert(assignments).values({
    shiftId: charlieShifts[0].id,
    userId: charlieId,
    status: 'pending_swap',
  });
  await db.insert(swapRequests).values({
    requestingUserId: charlieId,
    targetUserId: nyStaff[0].id,
    shiftId: charlieShifts[0].id,
    reason: reasons[0],
    status: 'pending_manager',
    expiresAt: addHours(now, 48),
    createdAt: subHours(now, 2),
  });

  // 3b. 4 incoming requests from colleagues targeting Charlie (status: 'pending_peer')
  for (let k = 0; k < 4; k++) {
    const shift = charlieShifts[1 + k];
    const peer = nyStaff[k % nyStaff.length];
    await db.insert(assignments).values({
      shiftId: shift.id,
      userId: peer.id,
      status: 'pending_swap',
    });
    await db.insert(swapRequests).values({
      requestingUserId: peer.id,
      targetUserId: charlieId,
      shiftId: shift.id,
      reason: reasons[k % reasons.length],
      status: 'pending_peer',
      expiresAt: addHours(now, 48),
      createdAt: subHours(now, 3 + k * 4),
    });
  }

  // 3c. 10 historical resolved requests involving Charlie (4 approved, 3 rejected, 3 cancelled)
  const charlieResolvedStatuses = [
    'approved',
    'approved',
    'approved',
    'approved',
    'rejected',
    'rejected',
    'rejected',
    'cancelled',
    'cancelled',
    'cancelled',
  ] as (typeof swapRequests.$inferInsert)['status'][];

  for (let k = 0; k < charlieResolvedStatuses.length; k++) {
    const shift = charlieShifts[5 + k];
    const peer = nyStaff[(k + 1) % nyStaff.length];
    const st = charlieResolvedStatuses[k];
    await db.insert(assignments).values({
      shiftId: shift.id,
      userId: charlieId,
      status: st === 'approved' ? 'swapped' : 'confirmed',
    });
    if (st === 'approved') {
      await db.insert(assignments).values({
        shiftId: shift.id,
        userId: peer.id,
        status: 'confirmed',
      });
    }
    await db.insert(swapRequests).values({
      requestingUserId: charlieId,
      targetUserId: peer.id,
      shiftId: shift.id,
      reason: reasons[k % reasons.length],
      status: st,
      expiresAt: addHours(now, 48),
      createdAt: subHours(now, 20 + k * 8),
    });
  }

  // 3d. 12 pending_manager requests from other NY staff (combined with Charlie's 1 = 13 for Bob)
  const managerSwapShifts = await db
    .insert(shifts)
    .values(
      Array.from({ length: 12 }, (_, k) => ({
        locationId: k % 2 === 0 ? loc1Id : loc2Id,
        requiredSkillId: nyStaff[k % nyStaff.length].skills[0],
        startTime: at(addDays(dayBase, 30 + k), 12),
        endTime: at(addDays(dayBase, 30 + k), 18),
        headcountNeeded: 1,
        status: 'published' as const,
        createdBy: bobId,
      })),
    )
    .returning();

  await db.insert(assignments).values(
    managerSwapShifts.map((s, k) => ({
      shiftId: s.id,
      userId: nyStaff[k % nyStaff.length].id,
      status: 'pending_swap' as const,
    })),
  );

  await db.insert(swapRequests).values(
    managerSwapShifts.map((s, k) => ({
      requestingUserId: nyStaff[k % nyStaff.length].id,
      targetUserId: nyStaff[(k + 1) % nyStaff.length].id,
      shiftId: s.id,
      reason: reasons[k % reasons.length],
      status: 'pending_manager' as const,
      expiresAt: addHours(now, 48),
      createdAt: subHours(now, 2 + k * 5),
    })),
  );

  // 4. Notifications: 25 for Charlie and 25 for Bob (both exceed 10/page across 3 pages)
  const charlieNotifs: {
    type: NotificationType;
    title: string;
    message: string;
  }[] = [
    {
      type: 'shift_assigned',
      title: 'New shift assigned',
      message: 'You have been assigned a new shift at Downtown.',
    },
    {
      type: 'schedule_published',
      title: 'Schedule published',
      message: 'The schedule for next week is now live.',
    },
    {
      type: 'swap_request_update',
      title: 'Swap request update',
      message: 'Your swap request is awaiting manager approval.',
    },
    {
      type: 'shift_modified',
      title: 'Shift updated',
      message: 'The start time of one of your shifts has changed.',
    },
    {
      type: 'overtime_warning',
      title: 'Approaching overtime',
      message: 'You are scheduled for 35 hours this week.',
    },
    {
      type: 'shift_cancelled',
      title: 'Shift cancelled',
      message: 'A shift you were assigned to has been cancelled.',
    },
  ];

  const bobNotifs: {
    type: NotificationType;
    title: string;
    message: string;
  }[] = [
    {
      type: 'swap_pending_approval',
      title: 'Swap needs approval',
      message: 'A staff swap request is waiting for your review.',
    },
    {
      type: 'conflict_alert',
      title: 'Scheduling conflict',
      message: 'A scheduling conflict was detected at Downtown.',
    },
    {
      type: 'availability_change',
      title: 'Availability changed',
      message: 'A staff member updated their availability.',
    },
    {
      type: 'overtime_warning',
      title: 'Overtime risk',
      message: 'A staff member is nearing the weekly overtime threshold.',
    },
  ];

  await db.insert(notifications).values([
    ...Array.from({ length: 25 }, (_, k) => ({
      userId: charlieId,
      ...charlieNotifs[k % charlieNotifs.length],
      isRead: k % 3 !== 0,
      createdAt: subHours(now, 1 + k * 4),
    })),
    ...Array.from({ length: 25 }, (_, k) => ({
      userId: bobId,
      ...bobNotifs[k % bobNotifs.length],
      isRead: k % 2 === 0,
      createdAt: subHours(now, 2 + k * 4),
    })),
  ]);

  // 5. Audit Logs: 14 entries on a single shift (for shift modal pagination) + 26 global (40 total)
  const trailShift = nyShifts[0];
  const actors = [aliceId, bobId, dianaId];

  const trailLogs = Array.from({ length: 14 }, (_, k) => {
    const hour = 8 + (k % 4);
    return {
      actorId: bobId,
      entityType: 'shift',
      entityId: trailShift.id,
      oldState:
        k === 0
          ? null
          : {
              startTime: at(addDays(dayBase, 3), 7 + (k % 4)).toISOString(),
              headcountNeeded: 1 + (k % 2),
            },
      newState: {
        startTime: at(addDays(dayBase, 3), hour).toISOString(),
        headcountNeeded: 1 + ((k + 1) % 2),
      },
      changedAt: subHours(now, 1 + k * 3),
    };
  });

  const otherLogs = Array.from({ length: 26 }, (_, k) => {
    const shift = nyShifts[(k % (nyShifts.length - 1)) + 1];
    const kind = k % 3;
    return {
      actorId: actors[k % actors.length],
      entityType: kind === 2 ? 'assignment' : 'shift',
      entityId: shift.id,
      oldState: kind === 0 ? null : { status: 'draft' },
      newState:
        kind === 2
          ? {
              status: 'confirmed',
              userId: nyShiftStaff[(k + 1) % nyShiftStaff.length].id,
            }
          : { status: 'published' },
      changedAt: subHours(now, 2 + k * 4),
    };
  });

  await db.insert(auditLogs).values([...trailLogs, ...otherLogs]);
}
