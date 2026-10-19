import { User } from './entities/user.entity';
import { Shift } from './entities/shift.entity';
import { Assignment } from './entities/assignment.entity';
import { Notification } from './entities/notification.entity';
import { Location } from './entities/location.entity';
import { Skill } from './entities/skill.entity';
import { SwapRequest } from './entities/swap-request.entity';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  Max,
  Length,
  IsUUID,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

/**
 * Request DTO for creating a new shift.
 * Validated via class-validator decorators during HTTP request processing.
 */
export class CreateShiftRequest {
  /** Target restaurant location UUID where the shift will take place */
  @IsUUID()
  locationId!: string;

  /** Required skill UUID (e.g., Bartender, Server, Line Cook) */
  @IsUUID()
  requiredSkillId!: string;

  /** Shift start timestamp formatted as an ISO-8601 string (e.g. '2026-10-19T17:00:00Z') */
  @IsDateString()
  startTime!: string;

  /** Shift end timestamp formatted as an ISO-8601 string */
  @IsDateString()
  endTime!: string;

  /** Number of staff members needed for this shift */
  @IsInt()
  @Min(1)
  headcountNeeded!: number;

  /** Shift publishing lifecycle status */
  @IsOptional()
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status?: 'draft' | 'published' | 'cancelled' | 'completed';

  /** Whether the shift is designated as a high-demand premium shift (Friday/Saturday evening) */
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

/**
 * Request DTO for updating an existing shift.
 * All fields are optional to allow partial updates.
 */
export class UpdateShiftRequest {
  /** Updated location UUID */
  @IsOptional()
  @IsUUID()
  locationId?: string;

  /** Updated required skill UUID */
  @IsOptional()
  @IsUUID()
  requiredSkillId?: string;

  /** Updated start timestamp in ISO-8601 string format */
  @IsOptional()
  @IsDateString()
  startTime?: string;

  /** Updated end timestamp in ISO-8601 string format */
  @IsOptional()
  @IsDateString()
  endTime?: string;

  /** Updated headcount needed */
  @IsOptional()
  @IsInt()
  @Min(1)
  headcountNeeded?: number;

  /** Updated shift status */
  @IsOptional()
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status?: 'draft' | 'published' | 'cancelled' | 'completed';

  /** Updated premium shift status */
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

/**
 * Request DTO for assigning staff to a scheduled shift.
 */
export class AssignStaffRequest {
  /** UUID of the staff member being assigned */
  @IsUUID()
  userId!: string;

  /** Mandatory documentation reason when overriding compliance warnings (e.g., 7th consecutive day) */
  @IsOptional()
  @IsString()
  overrideReason?: string;
}

/**
 * Request DTO for initiating a shift swap or drop request.
 */
export class CreateSwapRequest {
  /** UUID of the shift being swapped or dropped */
  @IsUUID()
  shiftId!: string;

  /** Optional target staff UUID for targeted peer swap. If omitted, shift is submitted as a drop request for grabs. */
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  /** Mandatory explanation note for the swap/drop request */
  @IsString()
  @Length(5, 500)
  reason!: string;
}

/**
 * Request DTO for responding to a pending peer swap request.
 */
export class RespondToSwapRequest {
  /** UUID of the swap request being responded to */
  @IsUUID()
  requestId!: string;

  /** Optional response or rejection explanation */
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}

/**
 * Request DTO for manager approval or rejection of a shift swap.
 */
export class ApproveSwapRequest {
  /** True to approve the swap and reassign shift; false to reject and revert assignment */
  @IsBoolean()
  approve!: boolean;
}

/**
 * Request DTO for updating a user profile.
 */
export class UpdateProfileRequest {
  /** Updated first name */
  @IsOptional()
  @IsString()
  @Length(2, 30)
  firstName?: string;

  /** Updated last name */
  @IsOptional()
  @IsString()
  @Length(2, 30)
  lastName?: string;

  /** Updated email address */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** Target desired weekly working hours (0-168) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  desiredWeeklyHours?: number;
}

/**
 * Request DTO for user login.
 */
export class LoginRequest {
  /** User login email */
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  /** Plaintext password to verify against stored bcrypt hash */
  @IsNotEmpty()
  @MinLength(6)
  pass!: string;
}

/**
 * Sanitized user entity without sensitive authentication fields such as passwordHash.
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Authentication response payload returned upon successful login.
 */
export interface AuthResponse {
  /** Signed JSON Web Token for Bearer authorization */
  access_token: string;
  /** Authenticated user profile */
  user: SafeUser;
}

/**
 * Response contract for a shift swap request with eager-loaded relations.
 */
export interface SwapRequestResponse extends SwapRequest {
  /** User who initiated the swap or drop */
  requestingUser: SafeUser;
  /** Peer user targeted in the swap (null for unassigned drop requests) */
  targetUser?: SafeUser | null;
  /** Associated shift details */
  shift: ShiftResponse;
}

/**
 * Response contract for a single shift with optional relation entities.
 */
export interface ShiftResponse extends Shift {
  /** Assigned staff members and user profiles */
  assignments?: (Assignment & { user?: Omit<User, 'passwordHash'> })[];
  /** Assigned restaurant location */
  location?: Location;
  /** Required role skill */
  requiredSkill?: Skill;
}

/**
 * Result returned upon assigning staff to a shift, including advisory compliance warnings.
 */
export interface AssignmentResult extends Assignment {
  /** Non-blocking advisory labor law warnings (e.g., approaching 40h weekly overtime) */
  warnings: string[];
  /** Full shift response if returned */
  shift?: ShiftResponse;
}

/**
 * Response model for staff members suggested as available to cover a shift.
 */
export interface AvailableStaffResponse {
  /** User UUID */
  id: string;
  /** Full formatted staff name */
  name: string;
  /** Advisory warnings for this candidate */
  warnings: string[];
  /** Whether assigning this candidate requires a manager override (e.g. 7th consecutive day) */
  requiresOverride: boolean;
}

/**
 * Response model for the real-time "On-Duty Now" dashboard.
 */
export interface OnDutyStaffResponse {
  /** Assignment or active shift UUID */
  id: string;
  /** Working staff profile */
  user: SafeUser;
  /** Restaurant location where currently on duty */
  location: Location;
  /** Time of clock in */
  clockIn: Date;
}

/**
 * Analytics record tracking staff hour distribution and scheduled vs desired load.
 */
export interface HourDistributionRecord {
  /** User UUID */
  userId: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Total scheduled hours in the evaluated window */
  totalHours: number;
  /** Preferred target hours configured in user profile */
  desiredWeeklyHours: number;
}

/**
 * Response model for the Fairness Index analytics evaluation.
 */
export interface FairnessScoreResponse {
  /** Distribution of premium weekend evening shifts across certified staff */
  distribution: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    premiumShiftCount: number;
  }>;
  /** Analytics time range start date */
  periodStart: Date;
  /** Analytics time range end date */
  periodEnd: Date;
  /** Normalized fairness score from 0 (heavily skewed) to 100 (perfectly equitable) */
  overallScore: number;
}

/**
 * Response model for immutable audit log entries.
 */
export interface AuditLogResponse {
  /** Unique audit log UUID */
  id: string;
  /** UUID of the actor who performed the action */
  actorId: string;
  /** Actor display details */
  actor: {
    firstName: string;
    lastName: string;
  };
  /** Entity domain type (e.g. 'shift', 'assignment', 'swap_request') */
  entityType: string;
  /** UUID of the target entity */
  entityId: string;
  /** State before modification */
  oldState: any;
  /** State after modification */
  newState: any;
  /** Modification timestamp */
  changedAt: Date | string;
}

/**
 * Response model for staff management listings with skills and certified locations.
 */
export interface StaffMemberResponse extends Omit<User, 'passwordHash'> {
  /** Certified skills possessed by the staff member */
  staffSkills: { skill: Skill }[];
  /** Restaurant locations the staff member is authorized to work */
  staffCertifications: { location: Location }[];
}

/**
 * Query parameters for cursor-based pagination endpoints.
 */
export interface CursorPaginationParams {
  /** Opaque base64url cursor marking the position from which to continue */
  cursor?: string;
  /** Maximum number of records to return */
  limit?: number;
}

/**
 * Standardized envelope for cursor-paginated response collections.
 *
 * @template T - The record entity type contained within the collection.
 */
export interface CursorPaginatedResponse<T> {
  /** Array of records for the current page */
  data: T[];
  /** Opaque cursor string for requesting the subsequent page, or null if no further pages */
  nextCursor: string | null;
  /** Boolean indicator whether additional pages exist beyond the current slice */
  hasMore: boolean;
}

/**
 * Single notification response entity.
 */
export type NotificationResponse = Notification;

/**
 * Paginated list envelope of user notifications.
 */
export type NotificationListResponse = CursorPaginatedResponse<Notification>;

/**
 * WebSocket broadcast payload for new real-time notification events.
 */
export type WsNotificationPayload = Notification;

/**
 * WebSocket event payload when a notification is marked read.
 */
export interface WsNotificationReadPayload {
  /** Notification UUID marked read */
  id: string;
}

/**
 * WebSocket broadcast payload when schedule changes are published.
 */
export interface WsScheduleUpdatePayload {
  /** User-friendly broadcast message */
  message: string;
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Standard HTTP API error response structure.
 */
export interface ApiErrorResponse {
  /** HTTP response status code */
  statusCode: number;
  /** Error message or array of validation errors */
  message: string | string[];
  /** Error category description */
  error: string;
  /** Machine-readable error code (e.g., 'OVERRIDE_REQUIRED', 'DOUBLE_BOOKING') */
  code?: string;
}
