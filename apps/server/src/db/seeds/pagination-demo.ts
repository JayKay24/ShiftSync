import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  shifts,
  assignments,
  swapRequests,
  notifications,
  auditLogs,
} from '@shiftsync/data-access';
import {
  addDays,
  addHours,
  setHours,
  setMinutes,
  startOfDay,
  subHours,
} from 'date-fns';
import { EXTRA_STAFF } from './base';

const LOC_DOWNTOWN = '11111111-1111-4111-8111-111111111111';
const LOC_UPTOWN = '11111111-1111-4111-8111-111111111112';
const LOC_BEACH = '11111111-1111-4111-8111-111111111113';

const SKILL_BARTENDER = '22222222-2222-4222-8222-222222222221';

const ALICE_ID = '33333333-3333-4333-8333-333333333330';
const BOB_ID = '33333333-3333-4333-8333-333333333331';
const CHARLIE_ID = '33333333-3333-4333-8333-333333333332';
const DIANA_ID = '33333333-3333-4333-8333-333333333336';

type NotificationType = (typeof notifications.$inferInsert)['type'];

const at = (day: Date, hour: number) => setHours(setMinutes(day, 0), hour);

/**
 * Seeds enough rows in every paginated list (shifts, staff, swaps, notifications,
 * audit logs) that the default 10-item pages show the "Load More" flow.
 * Staff are seeded in `seedBase`.
 *
 * Everything is placed relative to "now" so the data never goes stale:
 * shifts/swaps start 3+ days out, notifications and audit logs fall within the
 * last 5 days (inside the audit page's default 7-day range).
 */
export async function seedPaginationDemo(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding pagination demo data...');

  const now = new Date();
  const today = startOfDay(now);
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
  let i = 0;
  for (let d = 3; d < 15; d++) {
    for (const slot of slots) {
      const staff = nyStaff[i % nyStaff.length];
      nyShiftRows.push({
        locationId: i % 2 === 0 ? LOC_DOWNTOWN : LOC_UPTOWN,
        requiredSkillId: staff.skills[0],
        startTime: at(addDays(today, d), slot.start),
        endTime: at(addDays(today, d), slot.end),
        headcountNeeded: 1,
        status: 'published',
        createdBy: BOB_ID,
      });
      nyShiftStaff.push(staff);
      i++;
    }
  }
  const nyShifts = await db.insert(shifts).values(nyShiftRows).returning();
  await db
    .insert(assignments)
    .values(
      nyShifts.map((s, idx) => ({
        shiftId: s.id,
        userId: nyShiftStaff[idx].id,
        status: 'confirmed' as const,
      })),
    );

  // 2. Beach Grill schedule: 2 shifts/day for 6 days (12 shifts)
  const laShiftRows: (typeof shifts.$inferInsert)[] = [];
  const laShiftStaff: (typeof laStaff)[number][] = [];
  i = 0;
  for (let d = 3; d < 9; d++) {
    for (const slot of [slots[1], slots[2]]) {
      const staff = laStaff[i % laStaff.length];
      laShiftRows.push({
        locationId: LOC_BEACH,
        requiredSkillId: staff.skills[0],
        startTime: at(addDays(today, d), slot.start),
        endTime: at(addDays(today, d), slot.end),
        headcountNeeded: 1,
        status: 'published',
        createdBy: DIANA_ID,
      });
      laShiftStaff.push(staff);
      i++;
    }
  }
  const laShifts = await db.insert(shifts).values(laShiftRows).returning();
  await db
    .insert(assignments)
    .values(
      laShifts.map((s, idx) => ({
        shiftId: s.id,
        userId: laShiftStaff[idx].id,
        status: 'confirmed' as const,
      })),
    );

  // 3. Charlie's swaps: 14 requests across every status (Swap Marketplace pagination)
  const charlieShiftRows: (typeof shifts.$inferInsert)[] = [];
  for (let d = 15; d < 29; d++) {
    charlieShiftRows.push({
      locationId: LOC_DOWNTOWN,
      requiredSkillId: SKILL_BARTENDER,
      startTime: at(addDays(today, d), 10),
      endTime: at(addDays(today, d), 14),
      headcountNeeded: 1,
      status: 'published',
      createdBy: BOB_ID,
    });
  }
  const charlieShifts = await db
    .insert(shifts)
    .values(charlieShiftRows)
    .returning();
  const charlieStatuses = [
    ...Array(5).fill('pending_manager'),
    ...Array(3).fill('pending_peer'),
    ...Array(2).fill('approved'),
    ...Array(2).fill('rejected'),
    ...Array(2).fill('cancelled'),
  ] as (typeof swapRequests.$inferInsert)['status'][];

  await db.insert(assignments).values(
    charlieShifts.map((s, idx) => {
      const st = charlieStatuses[idx];
      return {
        shiftId: s.id,
        userId: CHARLIE_ID,
        status:
          st === 'approved'
            ? ('swapped' as const)
            : st === 'pending_manager' || st === 'pending_peer'
              ? ('pending_swap' as const)
              : ('confirmed' as const),
      };
    }),
  );

  const reasons = [
    'Family event',
    'Doctor appointment',
    'Class conflict',
    'Out of town',
    'Childcare fell through',
    'Car trouble',
  ];
  await db.insert(swapRequests).values(
    charlieShifts.map((s, idx) => {
      const status = charlieStatuses[idx];
      return {
        requestingUserId: CHARLIE_ID,
        targetUserId: nyStaff[idx % nyStaff.length].id,
        shiftId: s.id,
        reason: reasons[idx % reasons.length],
        status,
        expiresAt: addHours(now, 48),
        createdAt: subHours(now, 4 + idx * 5),
      };
    }),
  );
  // Peers who picked up the approved swaps
  const approvedIdx = charlieStatuses.flatMap((st, idx) =>
    st === 'approved' ? [idx] : [],
  );
  await db.insert(assignments).values(
    approvedIdx.map((idx) => ({
      shiftId: charlieShifts[idx].id,
      userId: nyStaff[idx % nyStaff.length].id,
      status: 'confirmed' as const,
    })),
  );

  // 4. Extra pending_manager swaps so Bob's approvals list also needs a second page (13 total)
  const managerSwapShifts = await db
    .insert(shifts)
    .values(
      Array.from({ length: 8 }, (_, k) => ({
        locationId: LOC_UPTOWN,
        requiredSkillId: nyStaff[k].skills[0],
        startTime: at(addDays(today, 29 + k), 12),
        endTime: at(addDays(today, 29 + k), 18),
        headcountNeeded: 1,
        status: 'published' as const,
        createdBy: BOB_ID,
      })),
    )
    .returning();
  await db
    .insert(assignments)
    .values(
      managerSwapShifts.map((s, k) => ({
        shiftId: s.id,
        userId: nyStaff[k].id,
        status: 'pending_swap' as const,
      })),
    );
  await db.insert(swapRequests).values(
    managerSwapShifts.map((s, k) => ({
      requestingUserId: nyStaff[k].id,
      targetUserId: nyStaff[(k + 1) % nyStaff.length].id,
      shiftId: s.id,
      reason: reasons[k % reasons.length],
      status: 'pending_manager' as const,
      expiresAt: addHours(now, 48),
      createdAt: subHours(now, 2 + k * 7),
    })),
  );

  // 5. Notifications: Charlie (18) and Bob (12), spread over the last 5 days
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
    ...Array.from({ length: 18 }, (_, k) => ({
      userId: CHARLIE_ID,
      ...charlieNotifs[k % charlieNotifs.length],
      isRead: k % 3 !== 0,
      createdAt: subHours(now, 1 + k * 6),
    })),
    ...Array.from({ length: 12 }, (_, k) => ({
      userId: BOB_ID,
      ...bobNotifs[k % bobNotifs.length],
      isRead: k % 2 === 0,
      createdAt: subHours(now, 2 + k * 9),
    })),
  ]);

  // 6. Audit logs: 14 entries on a single shift (so the shift Audit Trail modal paginates)
  //    plus 26 across other entities for the global audit page. ~3h apart, 40 total.
  const trailShift = nyShifts[0];
  const actors = [ALICE_ID, BOB_ID, DIANA_ID];
  const trailLogs = Array.from({ length: 14 }, (_, k) => {
    const hour = 8 + (k % 4);
    return {
      actorId: BOB_ID,
      entityType: 'shift',
      entityId: trailShift.id,
      oldState:
        k === 0
          ? null
          : {
              startTime: at(addDays(today, 3), 7 + (k % 4)).toISOString(),
              headcountNeeded: 1 + (k % 2),
            },
      newState: {
        startTime: at(addDays(today, 3), hour).toISOString(),
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
