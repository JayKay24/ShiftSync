import { http, HttpResponse } from 'msw';

import {
  AuditLogResponse,
  AvailableStaffResponse,
  CursorPaginatedResponse,
  FairnessScoreResponse,
  HourDistributionRecord,
  Location,
  OnDutyStaffResponse,
  SafeUser,
  ShiftResponse,
  Skill,
  StaffMemberResponse,
  SwapRequestResponse,
} from '@shiftsync/data-access';

/**
 * Standard test personas matching Coastal Eats seeded accounts.
 */
export const mockAdminUser: SafeUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@coastaleats.com',
  firstName: 'Alice',
  lastName: 'Admin',
  role: 'Admin',
  timezone: 'America/New_York',
  desiredWeeklyHours: 40,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const mockManagerUser: SafeUser = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'bob.manager@coastaleats.com',
  firstName: 'Bob',
  lastName: 'Manager',
  role: 'Manager',
  timezone: 'America/New_York',
  desiredWeeklyHours: 40,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const mockStaffUser: SafeUser = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'charlie.staff@coastaleats.com',
  firstName: 'Charlie',
  lastName: 'Staff',
  role: 'Staff',
  timezone: 'America/New_York',
  desiredWeeklyHours: 40,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const mockLocations: Location[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Downtown Bistro',
    address: '100 Broadway, New York, NY 10001',
    timezone: 'America/New_York',
    scheduleEditCutoffHours: 48,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Uptown Lounge',
    address: '200 Park Ave, New York, NY 10017',
    timezone: 'America/New_York',
    scheduleEditCutoffHours: 48,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Beach Grill',
    address: '50 Ocean Blvd, Santa Monica, CA 90401',
    timezone: 'America/Los_Angeles',
    scheduleEditCutoffHours: 48,
  },
];

export const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'server',
  },
  {
    id: 'skill-2',
    name: 'bartender',
  },
  {
    id: 'skill-3',
    name: 'line_cook',
  },
];

export const mockStandardShift: ShiftResponse = {
  id: 'shift-101',
  locationId: mockLocations[0].id,
  requiredSkillId: mockSkills[0].id,
  startTime: '2026-11-06T17:00:00.000Z' as unknown as Date,
  endTime: '2026-11-06T23:00:00.000Z' as unknown as Date,
  headcountNeeded: 2,
  isPremium: false,
  status: 'published',
  createdBy: mockManagerUser.id,
  location: mockLocations[0],
  requiredSkill: mockSkills[0],
  assignments: [
    {
      id: 'asgn-1',
      shiftId: 'shift-101',
      userId: mockStaffUser.id,
      status: 'confirmed',
      assignedAt: '2026-10-01T12:30:00.000Z' as unknown as Date,
      user: mockStaffUser,
    },
  ],
};

export const mockPremiumShift: ShiftResponse = {
  ...mockStandardShift,
  id: 'shift-premium-102',
  isPremium: true,
  startTime: '2026-11-07T18:00:00.000Z' as unknown as Date,
  endTime: '2026-11-08T02:00:00.000Z' as unknown as Date,
};

export const mockCutoffShift: ShiftResponse = {
  ...mockStandardShift,
  id: 'shift-cutoff-103',
  startTime: new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as unknown as Date,
  endTime: new Date(
    Date.now() + 32 * 60 * 60 * 1000,
  ).toISOString() as unknown as Date,
};

export const mockPastShift: ShiftResponse = {
  ...mockStandardShift,
  id: 'shift-past-104',
  startTime: '2026-01-10T12:00:00.000Z' as unknown as Date,
  endTime: '2026-01-10T18:00:00.000Z' as unknown as Date,
};

export const mockAvailableStaffList: AvailableStaffResponse[] = [
  {
    id: mockStaffUser.id,
    name: `${mockStaffUser.firstName} ${mockStaffUser.lastName}`,
    requiresOverride: false,
    warnings: [],
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'David Cook',
    requiresOverride: true,
    warnings: [
      'Consecutive day limit (7th day) requires documented justification',
    ],
  },
];

export const mockOnDutyStaffList: OnDutyStaffResponse[] = [
  {
    id: 'onduty-1',
    user: mockStaffUser,
    location: mockLocations[0],
    clockIn: new Date(Date.now() - 135 * 60 * 1000),
  },
  {
    id: 'onduty-2',
    user: {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'emma.server@coastaleats.com',
      firstName: 'Emma',
      lastName: 'Server',
      role: 'Staff',
      timezone: 'America/New_York',
      desiredWeeklyHours: 40,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    location: mockLocations[1],
    clockIn: new Date(Date.now() - 45 * 60 * 1000),
  },
];

export const mockStaffMemberProfile: StaffMemberResponse = {
  id: mockStaffUser.id,
  email: mockStaffUser.email,
  firstName: mockStaffUser.firstName,
  lastName: mockStaffUser.lastName,
  role: 'Staff',
  timezone: 'America/New_York',
  desiredWeeklyHours: 40,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  staffCertifications: [
    {
      location: mockLocations[0],
    },
    {
      location: mockLocations[1],
    },
  ],
  staffSkills: [
    {
      skill: mockSkills[0],
    },
    {
      skill: mockSkills[1],
    },
  ],
};

export const mockFairnessData: FairnessScoreResponse = {
  overallScore: 92.5,
  periodStart: new Date('2026-10-01T00:00:00.000Z'),
  periodEnd: new Date('2026-10-31T23:59:59.000Z'),
  distribution: [
    {
      userId: mockStaffUser.id,
      firstName: 'Charlie',
      lastName: 'Staff',
      premiumShiftCount: 4,
    },
  ],
};

export const mockDistributionData: HourDistributionRecord[] = [
  {
    userId: mockStaffUser.id,
    firstName: mockStaffUser.firstName,
    lastName: mockStaffUser.lastName,
    totalHours: 36.5,
    desiredWeeklyHours: 40,
  },
];

export const mockPendingSwapsList: SwapRequestResponse[] = [
  {
    id: 'swap-1',
    shiftId: mockStandardShift.id,
    requestingUserId: mockStaffUser.id,
    targetUserId: '00000000-0000-0000-0000-000000000005',
    status: 'pending_manager',
    reason: 'Family emergency this Friday evening',
    expiresAt: '2026-11-05T17:00:00.000Z' as unknown as Date,
    createdAt: '2026-10-28T10:00:00.000Z' as unknown as Date,
    shift: mockStandardShift,
    requestingUser: mockStaffUser,
    targetUser: {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'emma.server@coastaleats.com',
      firstName: 'Emma',
      lastName: 'Server',
      role: 'Staff',
      timezone: 'America/New_York',
      desiredWeeklyHours: 40,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  },
  {
    id: 'swap-2',
    shiftId: mockPremiumShift.id,
    requestingUserId: '00000000-0000-0000-0000-000000000004',
    targetUserId: null,
    status: 'pending_manager',
    reason: 'Doctor appointment scheduled',
    expiresAt: '2026-11-06T18:00:00.000Z' as unknown as Date,
    createdAt: '2026-10-28T14:00:00.000Z' as unknown as Date,
    shift: mockPremiumShift,
    requestingUser: {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'david.cook@coastaleats.com',
      firstName: 'David',
      lastName: 'Cook',
      role: 'Staff',
      timezone: 'America/New_York',
      desiredWeeklyHours: 40,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    targetUser: null,
  },
];

export const mockAuditLogsList: AuditLogResponse[] = [
  {
    id: 'audit-1',
    entityType: 'shift',
    entityId: mockStandardShift.id,
    actorId: mockManagerUser.id,
    oldState: { headcountNeeded: 1, isPremium: false },
    newState: { headcountNeeded: 2, isPremium: false },
    changedAt: new Date('2026-10-25T14:30:00.000Z'),
    actor: {
      firstName: mockManagerUser.firstName,
      lastName: mockManagerUser.lastName,
    },
  },
  {
    id: 'audit-2',
    entityType: 'shift',
    entityId: mockStandardShift.id,
    actorId: mockAdminUser.id,
    oldState: null,
    newState: { headcountNeeded: 1, isPremium: false, status: 'published' },
    changedAt: new Date('2026-10-20T09:00:00.000Z'),
    actor: {
      firstName: mockAdminUser.firstName,
      lastName: mockAdminUser.lastName,
    },
  },
];

/**
 * Baseline MSW handlers providing default mock responses for all ShiftSync client endpoints.
 */
export const defaultMswHandlers = [
  // Shifts endpoints
  http.get('*/api/shifts/locations', () => {
    return HttpResponse.json(mockLocations);
  }),
  http.get('*/api/shifts/skills', () => {
    return HttpResponse.json(mockSkills);
  }),
  http.get('*/api/shifts/on-duty', () => {
    return HttpResponse.json(mockOnDutyStaffList);
  }),
  http.get('*/api/shifts/stats', () => {
    return HttpResponse.json({
      activeShifts: 12,
      totalHours: 96,
      openShifts: 2,
      unassignedShifts: 1,
    });
  }),
  http.get('*/api/shifts/:id/available-staff', () => {
    return HttpResponse.json(mockAvailableStaffList);
  }),
  http.get('*/api/shifts/:id', () => {
    return HttpResponse.json(mockStandardShift);
  }),
  http.post('*/api/shifts', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      ...mockStandardShift,
      ...body,
      id: 'new-shift-' + Date.now(),
    });
  }),
  http.post('*/api/shifts/:id/assign', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: 'asgn-' + Date.now(),
      shiftId: 'shift-101',
      userId: body.userId,
      status: 'confirmed',
      assignedAt: new Date(),
      user: mockStaffUser,
      warnings: [],
    });
  }),

  // Swaps endpoints
  http.get('*/api/swaps', () => {
    const response: CursorPaginatedResponse<SwapRequestResponse> = {
      data: mockPendingSwapsList,
      nextCursor: null,
      hasMore: false,
    };
    return HttpResponse.json(response);
  }),
  http.put('*/api/swaps/approve/:id', () => {
    return HttpResponse.json({
      ...mockPendingSwapsList[0],
      status: 'approved',
    });
  }),

  // Staff & Analytics endpoints
  http.get('*/api/shifts/staff/:userId/assignments', () => {
    return HttpResponse.json([
      {
        id: 'asgn-1',
        shiftId: mockStandardShift.id,
        userId: mockStaffUser.id,
        status: 'confirmed',
        assignedAt: '2026-10-01T12:30:00.000Z' as unknown as Date,
        shift: mockStandardShift,
        warnings: [],
      },
      {
        id: 'asgn-2',
        shiftId: mockPremiumShift.id,
        userId: mockStaffUser.id,
        status: 'confirmed',
        assignedAt: '2026-10-02T12:30:00.000Z' as unknown as Date,
        shift: mockPremiumShift,
        warnings: [],
      },
    ]);
  }),
  http.get('*/api/analytics/fairness', () => {
    return HttpResponse.json(mockFairnessData);
  }),
  http.get('*/api/analytics/distribution', () => {
    return HttpResponse.json(mockDistributionData);
  }),

  // Audit endpoints
  http.get('*/api/audit/entity/:type/:id', () => {
    const response: CursorPaginatedResponse<AuditLogResponse> = {
      data: mockAuditLogsList,
      nextCursor: null,
      hasMore: false,
    };
    return HttpResponse.json(response);
  }),

  // Notifications endpoints
  http.get('*/api/notifications', () => {
    return HttpResponse.json({
      data: [],
      nextCursor: null,
      hasMore: false,
    });
  }),
  http.put('*/api/notifications/:id/read', () => {
    return HttpResponse.json({ success: true });
  }),
];
