import { z } from 'zod';
import { CursorPaginationQuerySchema } from './common.schemas';

/**
 * Zod schema validating shift creation request payloads.
 */
export const CreateShiftRequestSchema = z.object({
  /** Target restaurant location UUID where the shift will take place */
  locationId: z.uuid(),

  /** Required certified skill UUID (e.g., Bartender, Server, Line Cook) */
  requiredSkillId: z.uuid(),

  /** Shift start timestamp in ISO-8601 format */
  startTime: z.iso.datetime(),

  /** Shift end timestamp in ISO-8601 format */
  endTime: z.iso.datetime(),

  /** Number of staff members needed for this shift */
  headcountNeeded: z.number().int().min(1),

  /** Shift publishing lifecycle status */
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),

  /** Whether the shift is designated as a high-demand premium shift */
  isPremium: z.boolean().optional(),
});

/**
 * TypeScript type inferred from `CreateShiftRequestSchema`.
 */
export type CreateShiftRequest = z.infer<typeof CreateShiftRequestSchema>;

/**
 * Zod schema validating shift update request payloads.
 * All fields are optional to allow partial updates.
 */
export const UpdateShiftRequestSchema = z.object({
  /** Updated location UUID */
  locationId: z.uuid().optional(),

  /** Updated required skill UUID */
  requiredSkillId: z.uuid().optional(),

  /** Updated start timestamp in ISO-8601 format */
  startTime: z.iso.datetime().optional(),

  /** Updated end timestamp in ISO-8601 format */
  endTime: z.iso.datetime().optional(),

  /** Updated headcount needed */
  headcountNeeded: z.number().int().min(1).optional(),

  /** Updated shift status */
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),

  /** Updated premium shift status */
  isPremium: z.boolean().optional(),
});

/**
 * TypeScript type inferred from `UpdateShiftRequestSchema`.
 */
export type UpdateShiftRequest = z.infer<typeof UpdateShiftRequestSchema>;

/**
 * Zod schema validating staff assignment request payloads.
 */
export const AssignStaffRequestSchema = z.object({
  /** UUID of the staff member being assigned */
  userId: z.uuid(),

  /** Mandatory documentation reason when overriding compliance warnings (e.g. 7th consecutive day) */
  overrideReason: z.string().optional(),
});

/**
 * TypeScript type inferred from `AssignStaffRequestSchema`.
 */
export type AssignStaffRequest = z.infer<typeof AssignStaffRequestSchema>;

/**
 * Zod schema validating shift swap or drop requests.
 */
export const CreateSwapRequestSchema = z.object({
  /** UUID of the shift being swapped or dropped */
  shiftId: z.uuid(),

  /** Optional target staff UUID for peer swap; if omitted, submitted as a drop request for grabs */
  targetUserId: z.uuid().optional(),

  /** Mandatory explanation note for the swap/drop request */
  reason: z.string().min(5).max(500),
});

/**
 * TypeScript type inferred from `CreateSwapRequestSchema`.
 */
export type CreateSwapRequest = z.infer<typeof CreateSwapRequestSchema>;

/**
 * Zod schema validating peer swap responses.
 */
export const RespondToSwapRequestSchema = z.object({
  /** UUID of the swap request being responded to */
  requestId: z.uuid(),

  /** Optional response or rejection explanation */
  reason: z.string().max(200).optional(),
});

/**
 * TypeScript type inferred from `RespondToSwapRequestSchema`.
 */
export type RespondToSwapRequest = z.infer<typeof RespondToSwapRequestSchema>;

/**
 * Zod schema validating manager swap approval or rejection requests.
 */
export const ApproveSwapRequestSchema = z.object({
  /** True to approve the swap and reassign shift; false to reject and revert assignment */
  approve: z.boolean(),
});

/**
 * TypeScript type inferred from `ApproveSwapRequestSchema`.
 */
export type ApproveSwapRequest = z.infer<typeof ApproveSwapRequestSchema>;

/**
 * Zod schema validating user profile updates.
 */
export const UpdateProfileRequestSchema = z.object({
  /** Updated first name */
  firstName: z.string().min(2).max(30).optional(),

  /** Updated last name */
  lastName: z.string().min(2).max(30).optional(),

  /** Updated email address */
  email: z.email().optional(),

  /** Target desired weekly working hours (0-168) */
  desiredWeeklyHours: z.number().int().min(0).max(168).optional(),
});

/**
 * TypeScript type inferred from `UpdateProfileRequestSchema`.
 */
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/**
 * Zod schema validating user login requests.
 */
export const LoginRequestSchema = z.object({
  /** User login email */
  email: z.email(),

  /** Plaintext password */
  pass: z.string().min(6),
});

/**
 * TypeScript type inferred from `LoginRequestSchema`.
 */
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Query parameter schema for filtering shifts with date ranges, location, and cursor pagination.
 */
export const ShiftFilterQuerySchema = CursorPaginationQuerySchema.extend({
  /** Start of the scheduling window in ISO-8601 format */
  startDate: z.string().optional(),
  /** Alias for startDate */
  start: z.string().optional(),
  /** End of the scheduling window in ISO-8601 format */
  endDate: z.string().optional(),
  /** Alias for endDate */
  end: z.string().optional(),
  /** Filter by specific restaurant location UUID */
  locationId: z.uuid().optional(),
});

/**
 * TypeScript type inferred from `ShiftFilterQuerySchema`.
 */
export type ShiftFilterQuery = z.infer<typeof ShiftFilterQuerySchema>;

/**
 * Query parameter schema for analytics endpoints evaluating date ranges.
 */
export const AnalyticsDateRangeQuerySchema = z.object({
  /** Analytics time range start date */
  startDate: z.string().optional(),
  /** Analytics time range end date */
  endDate: z.string().optional(),
});

/**
 * TypeScript type inferred from `AnalyticsDateRangeQuerySchema`.
 */
export type AnalyticsDateRangeQuery = z.infer<
  typeof AnalyticsDateRangeQuerySchema
>;

/**
 * Query parameter schema for querying audit logs with date range and cursor pagination.
 */
export const AuditLogQuerySchema = CursorPaginationQuerySchema.extend({
  /** Filter logs created on or after this timestamp */
  startDate: z.string().optional(),
  /** Filter logs created on or before this timestamp */
  endDate: z.string().optional(),
});

/**
 * TypeScript type inferred from `AuditLogQuerySchema`.
 */
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
