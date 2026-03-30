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
 * Request body for creating a new shift
 */
export class CreateShiftRequest {
  @IsUUID()
  locationId!: string;

  @IsUUID()
  requiredSkillId!: string;

  @IsDateString()
  startTime!: string; // ISO String

  @IsDateString()
  endTime!: string; // ISO String

  @IsInt()
  @Min(1)
  headcountNeeded!: number;

  @IsOptional()
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status?: 'draft' | 'published' | 'cancelled' | 'completed';

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

/**
 * Request body for updating an existing shift
 */
export class UpdateShiftRequest {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  requiredSkillId?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  headcountNeeded?: number;

  @IsOptional()
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status?: 'draft' | 'published' | 'cancelled' | 'completed';

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

/**
 * Request body for assigning staff to a shift
 */
export class AssignStaffRequest {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}

/**
 * Request body for creating a swap request
 */
export class CreateSwapRequest {
  @IsUUID()
  shiftId!: string;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsString()
  @Length(5, 500)
  reason!: string;
}

/**
 * Request body for responding to a swap request
 */
export class RespondToSwapRequest {
  @IsUUID()
  requestId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}

/**
 * Request body for approving/rejecting a swap request (Manager)
 */
export class ApproveSwapRequest {
  @IsBoolean()
  approve!: boolean;
}

/**
 * Request body for updating user profile
 */
export class UpdateProfileRequest {
  @IsOptional()
  @IsString()
  @Length(2, 30)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 30)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  desiredWeeklyHours?: number;
}

/**
 * Request body for login
 */
export class LoginRequest {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  pass!: string;
}

/**
 * Safe version of User entity without sensitive fields
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Response returned after a successful login
 */
export interface AuthResponse {
  access_token: string;
  user: SafeUser;
}

/**
 * Response for a swap request with relations
 */
export interface SwapRequestResponse extends SwapRequest {
  requestingUser: SafeUser;
  targetUser?: SafeUser | null;
  shift: ShiftResponse;
}

/**
 * Response for a single shift, potentially with relations
 */
export interface ShiftResponse extends Shift {
  assignments?: (Assignment & { user?: Omit<User, 'passwordHash'> })[];
  location?: Location;
  requiredSkill?: Skill;
}

/**
 * Result of a staff assignment, including any non-blocking warnings
 */
export interface AssignmentResult extends Assignment {
  warnings: string[];
  shift?: ShiftResponse;
}

/**
 * Response for suggested alternative staff
 */
export interface AvailableStaffResponse {
  id: string;
  name: string;
  warnings: string[];
  requiresOverride: boolean;
}

/**
 * Response for the "On-Duty Now" dashboard
 */
export interface OnDutyStaffResponse {
  id: string;
  user: SafeUser;
  location: Location;
  clockIn: Date;
}

/**
 * Record for hour distribution analytics
 */
export interface HourDistributionRecord {
  userId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
  desiredWeeklyHours: number;
}

/**
 * Response for the fairness score analytics
 */
export interface FairnessScoreResponse {
  distribution: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    premiumShiftCount: number;
  }>;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Response for staff management list with nested skills and certifications
 */
export interface StaffMemberResponse extends Omit<User, 'passwordHash'> {
  staffSkills: { skill: Skill }[];
  staffCertifications: { location: Location }[];
}

/**
 * Single notification response
 */
export type NotificationResponse = Notification;
/**
 * List of notifications
 */
export type NotificationListResponse = Notification[];

/**
 * WebSocket Event Payloads
 */
export type WsNotificationPayload = Notification;

export interface WsNotificationReadPayload {
  id: string;
}

export interface WsScheduleUpdatePayload {
  message: string;
  timestamp: Date;
}

/**
 * Generic API Error Response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string; // e.g., 'OVERRIDE_REQUIRED'
}
