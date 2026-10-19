import { Injectable } from '@nestjs/common';
import {
  AuditRepository,
  CursorPaginationParams,
  CursorPaginatedResponse,
  AuditLogResponse,
} from '@shiftsync/data-access';

/**
 * Service managing corporate schedule audit trails and change logs.
 */
@Injectable()
export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

  /**
   * Records an immutable audit log entry documenting an entity state transition.
   *
   * @template T
   * @param {string} actorId - ID of the user performing the change.
   * @param {string} entityType - Entity type category (e.g., 'shift', 'assignment', 'swap_request').
   * @param {string} entityId - Primary key of the entity.
   * @param {T | null} oldState - Entity state prior to modification, or null on creation.
   * @param {T | null} newState - Entity state after modification, or null on deletion.
   * @returns {Promise<any[]>} Persisted audit log database entry.
   */
  async logChange<T>(
    actorId: string,
    entityType: string,
    entityId: string,
    oldState: T | null,
    newState: T | null,
  ) {
    return this.auditRepo.logChange(
      actorId,
      entityType,
      entityId,
      oldState,
      newState,
    );
  }

  /**
   * Retrieves paginated audit history for a specific entity.
   *
   * @param {string} entityType - Target entity type.
   * @param {string} entityId - Target entity identifier.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<AuditLogResponse>>} Paginated audit records with actor details.
   */
  async getLogsByEntity(
    entityType: string,
    entityId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    return this.auditRepo.getLogsByEntity(entityType, entityId, pagination);
  }

  /**
   * Retrieves paginated audit logs across all entities within a specified date interval.
   *
   * @param {Date} startDate - Start of time range.
   * @param {Date} endDate - End of time range.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<AuditLogResponse>>} Paginated audit records.
   */
  async getLogsInRange(
    startDate: Date,
    endDate: Date,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    return this.auditRepo.getLogsInRange(startDate, endDate, pagination);
  }
}
