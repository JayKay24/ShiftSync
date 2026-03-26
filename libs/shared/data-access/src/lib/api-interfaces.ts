import { User } from './entities/user.entity';
import { Shift } from './entities/shift.entity';
import { Assignment } from './entities/assignment.entity';
import { Notification } from './entities/notification.entity';

/**
 * Response returned after a successful login
 */
export interface AuthResponse {
  access_token: string;
  user: Omit<User, 'passwordHash'>;
}

/**
 * Result of a staff assignment, including any non-blocking warnings
 */
export interface AssignmentResult extends Assignment {
  warnings: string[];
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
