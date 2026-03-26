import { User } from './entities/user.entity';
import { Shift } from './entities/shift.entity';
import { Assignment } from './entities/assignment.entity';

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
 * Generic API Error Response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string; // e.g., 'OVERRIDE_REQUIRED'
}
