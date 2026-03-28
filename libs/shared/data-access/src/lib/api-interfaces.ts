import { User } from './entities/user.entity';
import { Shift } from './entities/shift.entity';
import { Assignment } from './entities/assignment.entity';
import { Notification } from './entities/notification.entity';
import { Location } from './entities/location.entity';
import { Skill } from './entities/skill.entity';

/**
 * Response returned after a successful login
 */
export interface AuthResponse {
  access_token: string;
  user: Omit<User, 'passwordHash'>;
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
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  location: {
    id: string;
    name: string;
  };
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
export interface WsNotificationPayload extends Notification {}

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

/**
 * Request body for creating a new shift
 */
export interface CreateShiftRequest {
  locationId: string;
  requiredSkillId: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  headcountNeeded: number;
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
  isPremium?: boolean;
}

/**
 * Request body for updating an existing shift
 */
export type UpdateShiftRequest = Partial<CreateShiftRequest>;

/**
 * Request body for assigning staff to a shift
 */
export interface AssignStaffRequest {
  userId: string;
  overrideReason?: string;
}
