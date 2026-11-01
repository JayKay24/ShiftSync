import { z } from 'zod';
import {
  SerializedDateTimeSchema,
  createCursorPaginatedSchema,
} from './common.schemas';

/**
 * Zod schema describing restaurant location entities in API responses.
 */
export const LocationSchema = z.object({
  /** Unique location UUID */
  id: z.uuid(),
  /** Restaurant location display name */
  name: z.string(),
  /** IANA timezone identifier (e.g. 'America/New_York') */
  timezone: z.string(),
  /** Physical street address */
  address: z.string().nullable().optional(),
  /** Hours before shift start when schedule modifications lock for managers */
  scheduleEditCutoffHours: z.number().int(),
});

/**
 * Zod schema describing employee certified skill entities in API responses.
 */
export const SkillSchema = z.object({
  /** Unique skill UUID */
  id: z.uuid(),
  /** Role specialization identifier */
  name: z.enum(['bartender', 'line_cook', 'server', 'host']),
});

/**
 * Zod schema describing sanitized user profile objects with passwordHash omitted.
 */
export const SafeUserSchema = z.object({
  /** Unique user UUID */
  id: z.uuid(),
  /** User account email */
  email: z.email(),
  /** First name */
  firstName: z.string(),
  /** Last name */
  lastName: z.string(),
  /** User authorization role */
  role: z.enum(['Admin', 'Manager', 'Staff']),
  /** Primary location IANA timezone */
  timezone: z.string(),
  /** Target desired weekly working hours (0-168) */
  desiredWeeklyHours: z.number().int(),
  /** Account creation timestamp */
  createdAt: SerializedDateTimeSchema,
});

/**
 * TypeScript type inferred from `SafeUserSchema`.
 */
export type SafeUser = z.infer<typeof SafeUserSchema>;

/**
 * Zod schema describing successful authentication responses.
 */
export const AuthResponseSchema = z.object({
  /** Signed JSON Web Token for Bearer authorization */
  access_token: z.string(),
  /** Authenticated user profile */
  user: SafeUserSchema,
});

/**
 * TypeScript type inferred from `AuthResponseSchema`.
 */
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Zod schema describing shift assignment records.
 */
export const AssignmentSchema = z.object({
  /** Unique assignment UUID */
  id: z.uuid(),
  /** Associated scheduled shift UUID */
  shiftId: z.uuid(),
  /** Assigned staff member user UUID */
  userId: z.uuid(),
  /** Lifecycle status of the assignment */
  status: z.enum([
    'confirmed',
    'pending_drop',
    'pending_swap',
    'swapped',
    'dropped',
  ]),
  /** Assignment creation timestamp */
  assignedAt: SerializedDateTimeSchema,
});

/**
 * Zod schema describing shift responses with eager-loaded relations.
 */
export const ShiftResponseSchema = z.object({
  /** Unique shift UUID */
  id: z.uuid(),
  /** Restaurant location UUID */
  locationId: z.uuid(),
  /** Required skill UUID */
  requiredSkillId: z.uuid(),
  /** Shift start timestamp in ISO-8601 format */
  startTime: SerializedDateTimeSchema,
  /** Shift end timestamp in ISO-8601 format */
  endTime: SerializedDateTimeSchema,
  /** Headcount target needed for shift */
  headcountNeeded: z.number().int(),
  /** Shift publishing lifecycle status */
  status: z.enum(['draft', 'published', 'cancelled', 'completed']),
  /** Whether the shift is designated as a premium weekend evening shift */
  isPremium: z.boolean(),
  /** Creator user UUID */
  createdBy: z.uuid(),
  /** Assigned staff members with user profiles */
  assignments: z
    .array(
      AssignmentSchema.extend({
        user: SafeUserSchema.optional(),
      }),
    )
    .optional(),
  /** Assigned restaurant location */
  location: LocationSchema.optional(),
  /** Required role skill */
  requiredSkill: SkillSchema.optional(),
});

/**
 * TypeScript type inferred from `ShiftResponseSchema`.
 */
export type ShiftResponse = z.infer<typeof ShiftResponseSchema>;

/**
 * Zod schema describing assignments returned in user assignment queries.
 */
export const UserAssignmentResponseSchema = AssignmentSchema.extend({
  /** Associated shift details */
  shift: ShiftResponseSchema.optional(),
});

/**
 * TypeScript type inferred from `UserAssignmentResponseSchema`.
 */
export type UserAssignmentResponse = z.infer<
  typeof UserAssignmentResponseSchema
>;

/**
 * Zod schema describing assignment results including compliance warnings.
 */
export const AssignmentResultSchema = AssignmentSchema.extend({
  /** Non-blocking advisory labor law warnings */
  warnings: z.array(z.string()),
  /** Full shift response if returned */
  shift: ShiftResponseSchema.optional(),
});

/**
 * TypeScript type inferred from `AssignmentResultSchema`.
 */
export type AssignmentResult = z.infer<typeof AssignmentResultSchema>;

/**
 * Zod schema describing staff suggested as available to cover a shift.
 */
export const AvailableStaffResponseSchema = z.object({
  /** Staff user UUID */
  id: z.uuid(),
  /** Full formatted staff name */
  name: z.string(),
  /** Advisory warnings for this candidate */
  warnings: z.array(z.string()),
  /** Whether assigning candidate requires a manager override */
  requiresOverride: z.boolean(),
});

/**
 * TypeScript type inferred from `AvailableStaffResponseSchema`.
 */
export type AvailableStaffResponse = z.infer<
  typeof AvailableStaffResponseSchema
>;

/**
 * Zod schema describing staff currently clocked in and on duty.
 */
export const OnDutyStaffResponseSchema = z.object({
  /** Assignment or active shift UUID */
  id: z.uuid(),
  /** Working staff profile */
  user: SafeUserSchema,
  /** Restaurant location where currently on duty */
  location: LocationSchema,
  /** Time of clock in */
  clockIn: SerializedDateTimeSchema,
});

/**
 * TypeScript type inferred from `OnDutyStaffResponseSchema`.
 */
export type OnDutyStaffResponse = z.infer<typeof OnDutyStaffResponseSchema>;

/**
 * Zod schema describing high-level dashboard metrics.
 */
export const DashboardStatsResponseSchema = z.object({
  /** Total staff members */
  totalStaff: z.number().int(),
  /** Pending swap requests awaiting manager review */
  pendingSwaps: z.number().int(),
  /** Upcoming scheduled shifts */
  upcomingShifts: z.number().int(),
});

/**
 * TypeScript type inferred from `DashboardStatsResponseSchema`.
 */
export type DashboardStatsResponse = z.infer<
  typeof DashboardStatsResponseSchema
>;

/**
 * Zod schema describing staff directory listings with certified skills and locations.
 */
export const StaffMemberResponseSchema = SafeUserSchema.extend({
  /** Certified skills possessed by staff */
  staffSkills: z.array(z.object({ skill: SkillSchema })),
  /** Authorized restaurant locations */
  staffCertifications: z.array(z.object({ location: LocationSchema })),
});

/**
 * TypeScript type inferred from `StaffMemberResponseSchema`.
 */
export type StaffMemberResponse = z.infer<typeof StaffMemberResponseSchema>;

/**
 * Zod schema describing basic swap request records without relation expansions.
 */
export const BaseSwapRequestSchema = z.object({
  /** Unique swap request UUID */
  id: z.uuid(),
  /** User who initiated the swap or drop */
  requestingUserId: z.uuid(),
  /** Target staff UUID (null for drop requests) */
  targetUserId: z.uuid().nullable().optional(),
  /** Target shift UUID */
  shiftId: z.uuid(),
  /** Current lifecycle status */
  status: z.enum([
    'pending_peer',
    'pending_manager',
    'approved',
    'rejected',
    'cancelled',
  ]),
  /** Explanation note */
  reason: z.string(),
  /** Optional expiration timestamp */
  expiresAt: SerializedDateTimeSchema.nullable().optional(),
  /** Request timestamp */
  createdAt: SerializedDateTimeSchema,
});

/**
 * TypeScript type inferred from `BaseSwapRequestSchema`.
 */
export type BaseSwapRequest = z.infer<typeof BaseSwapRequestSchema>;

/**
 * Zod schema describing simple status or confirmation message responses.
 */
export const ActionMessageResponseSchema = z.object({
  /** Operation status confirmation message */
  message: z.string(),
});

/**
 * TypeScript type inferred from `ActionMessageResponseSchema`.
 */
export type ActionMessageResponse = z.infer<typeof ActionMessageResponseSchema>;

/**
 * Zod schema describing manager swap approval results.
 */
export const ApproveSwapResponseSchema = z.object({
  /** Updated swap lifecycle status */
  status: z.string(),
});

/**
 * TypeScript type inferred from `ApproveSwapResponseSchema`.
 */
export type ApproveSwapResponse = z.infer<typeof ApproveSwapResponseSchema>;

/**
 * Zod schema describing shift swap requests with eager-loaded relations.
 */
export const SwapRequestResponseSchema = BaseSwapRequestSchema.extend({
  /** Requesting user profile */
  requestingUser: SafeUserSchema,
  /** Target peer profile */
  targetUser: SafeUserSchema.nullable().optional(),
  /** Associated shift details */
  shift: ShiftResponseSchema,
});

/**
 * TypeScript type inferred from `SwapRequestResponseSchema`.
 */
export type SwapRequestResponse = z.infer<typeof SwapRequestResponseSchema>;

/**
 * Zod schema describing weekly working hour distribution analytics records.
 */
export const HourDistributionRecordSchema = z.object({
  /** Staff user UUID */
  userId: z.uuid(),
  /** Staff first name */
  firstName: z.string(),
  /** Staff last name */
  lastName: z.string(),
  /** Total scheduled hours in evaluated window */
  totalHours: z.number(),
  /** Preferred target hours configured in user profile */
  desiredWeeklyHours: z.number(),
});

/**
 * TypeScript type inferred from `HourDistributionRecordSchema`.
 */
export type HourDistributionRecord = z.infer<
  typeof HourDistributionRecordSchema
>;

/**
 * Zod schema describing Fairness Index analytics evaluation responses.
 */
export const FairnessScoreResponseSchema = z.object({
  /** Distribution of premium weekend shifts across staff */
  distribution: z.array(
    z.object({
      /** Staff user UUID */
      userId: z.uuid(),
      /** Staff first name */
      firstName: z.string(),
      /** Staff last name */
      lastName: z.string(),
      /** Count of assigned premium weekend evening shifts */
      premiumShiftCount: z.number().int(),
    }),
  ),
  /** Analytics time range start date */
  periodStart: SerializedDateTimeSchema,
  /** Analytics time range end date */
  periodEnd: SerializedDateTimeSchema,
  /** Normalized fairness score from 0 (heavily skewed) to 100 (perfectly equitable) */
  overallScore: z.number(),
});

/**
 * TypeScript type inferred from `FairnessScoreResponseSchema`.
 */
export type FairnessScoreResponse = z.infer<typeof FairnessScoreResponseSchema>;

/**
 * Zod schema describing immutable audit log entries.
 */
export const AuditLogResponseSchema = z.object({
  /** Unique audit log UUID */
  id: z.uuid(),
  /** UUID of the actor who performed the action */
  actorId: z.uuid(),
  /** Actor display details */
  actor: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }),
  /** Entity domain type (e.g. 'shift', 'assignment', 'swap_request') */
  entityType: z.string(),
  /** UUID of the target entity */
  entityId: z.uuid(),
  /** State before modification */
  oldState: z.any().nullable().optional(),
  /** State after modification */
  newState: z.any().nullable().optional(),
  /** Modification timestamp */
  changedAt: SerializedDateTimeSchema,
});

/**
 * TypeScript type inferred from `AuditLogResponseSchema`.
 */
export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;

/**
 * Zod schema describing notification entities.
 */
export const NotificationResponseSchema = z.object({
  /** Unique notification UUID */
  id: z.uuid(),
  /** Target user UUID */
  userId: z.uuid(),
  /** Notification title */
  title: z.string(),
  /** Detailed message text */
  message: z.string(),
  /** Notification event type */
  type: z.enum([
    'shift_assigned',
    'shift_modified',
    'shift_cancelled',
    'schedule_published',
    'swap_request_update',
    'swap_pending_approval',
    'overtime_warning',
    'availability_change',
    'conflict_alert',
  ]),
  /** Whether marked as read */
  isRead: z.boolean(),
  /** Optional metadata payload */
  payload: z.any().nullable().optional(),
  /** Creation timestamp */
  createdAt: SerializedDateTimeSchema,
});

/**
 * TypeScript type inferred from `NotificationResponseSchema`.
 */
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

/**
 * Zod schema describing cursor-paginated staff listings.
 */
export const PaginatedStaffResponseSchema = createCursorPaginatedSchema(
  StaffMemberResponseSchema,
);

/**
 * Zod schema describing cursor-paginated shift listings.
 */
export const PaginatedShiftsResponseSchema =
  createCursorPaginatedSchema(ShiftResponseSchema);

/**
 * Zod schema describing cursor-paginated swap listings.
 */
export const PaginatedSwapsResponseSchema = createCursorPaginatedSchema(
  SwapRequestResponseSchema,
);

/**
 * Zod schema describing cursor-paginated audit log listings.
 */
export const PaginatedAuditLogsResponseSchema = createCursorPaginatedSchema(
  AuditLogResponseSchema,
);

/**
 * Zod schema describing cursor-paginated notification listings.
 */
export const NotificationListResponseSchema = createCursorPaginatedSchema(
  NotificationResponseSchema,
);

/**
 * TypeScript type for paginated notification listings.
 */
export type NotificationListResponse = z.infer<
  typeof NotificationListResponseSchema
>;

/**
 * WebSocket broadcast payload for new real-time notification events.
 */
export const WsNotificationPayloadSchema = NotificationResponseSchema;

/**
 * TypeScript type for WebSocket notification payloads.
 */
export type WsNotificationPayload = z.infer<typeof WsNotificationPayloadSchema>;

/**
 * WebSocket event payload when a notification is marked read.
 */
export const WsNotificationReadPayloadSchema = z.object({
  /** Notification UUID marked read */
  id: z.uuid(),
});

/**
 * TypeScript type for WebSocket notification read events.
 */
export type WsNotificationReadPayload = z.infer<
  typeof WsNotificationReadPayloadSchema
>;

/**
 * WebSocket broadcast payload when schedule changes are published.
 */
export const WsScheduleUpdatePayloadSchema = z.object({
  /** Broadcast user message */
  message: z.string(),
  /** Event timestamp */
  timestamp: SerializedDateTimeSchema,
});

/**
 * TypeScript type for WebSocket schedule update events.
 */
export type WsScheduleUpdatePayload = z.infer<
  typeof WsScheduleUpdatePayloadSchema
>;
