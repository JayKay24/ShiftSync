import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte, lt, gt, or } from 'drizzle-orm';
import { schema } from '../schema';
import { auditLogs } from '../entities/audit-log.entity';
import {
  CursorPaginationParams,
  CursorPaginatedResponse,
  AuditLogResponse,
} from '../api-interfaces';
import { clampLimit, decodeCursor, paginateResults } from '../pagination';

/**
 * Repository handling audit logging and history retrieval.
 * Provides immutable audit trail storage for schedule modifications and entity diffs.
 */
export class AuditRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Persists an immutable audit log record for an entity modification.
   *
   * @template T
   * @param {string} actorId - Unique identifier of the user making the modification.
   * @param {string} entityType - The category or table name of the affected entity (e.g., 'shift', 'swap_request').
   * @param {string} entityId - Primary key of the modified entity.
   * @param {T | null} oldState - Pre-modification snapshot state of the entity, or null if created.
   * @param {T | null} newState - Post-modification snapshot state of the entity, or null if deleted.
   * @returns {Promise<any[]>} Created audit log database record.
   */
  async logChange<T>(
    actorId: string,
    entityType: string,
    entityId: string,
    oldState: T | null,
    newState: T | null,
  ) {
    return this.db
      .insert(auditLogs)
      .values({
        actorId,
        entityType,
        entityId,
        oldState,
        newState,
      })
      .returning();
  }

  /**
   * Retrieves chronological audit logs for a specific entity with keyset pagination.
   *
   * @param {string} entityType - Target entity type (e.g., 'shift').
   * @param {string} entityId - Target entity identifier.
   * @param {CursorPaginationParams} [pagination] - Pagination options including limit and cursor token.
   * @returns {Promise<CursorPaginatedResponse<AuditLogResponse>>} Paginated audit records with actor metadata.
   */
  async getLogsByEntity(
    entityType: string,
    entityId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    const limit = clampLimit(pagination?.limit);
    const conditions = [
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId),
    ];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      const cursorDate = new Date(cursorPayload.value);
      conditions.push(
        or(
          gt(auditLogs.changedAt, cursorDate),
          and(
            eq(auditLogs.changedAt, cursorDate),
            gt(auditLogs.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.auditLogs.findMany({
      where: and(...conditions),
      with: {
        actor: {
          columns: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: (auditLogs, { asc }) => [
        asc(auditLogs.changedAt),
        asc(auditLogs.id),
      ],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as AuditLogResponse[],
      limit,
      (log) => log.changedAt,
    );
  }

  /**
   * Retrieves audit logs recorded across the system within a date window, ordered newest-first.
   *
   * @param {Date} startDate - Start of the audit search window (inclusive).
   * @param {Date} endDate - End of the audit search window (inclusive).
   * @param {CursorPaginationParams} [pagination] - Pagination options including limit and cursor token.
   * @returns {Promise<CursorPaginatedResponse<AuditLogResponse>>} Paginated audit records with actor metadata.
   */
  async getLogsInRange(
    startDate: Date,
    endDate: Date,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    const limit = clampLimit(pagination?.limit);
    const conditions = [
      gte(auditLogs.changedAt, startDate),
      lte(auditLogs.changedAt, endDate),
    ];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      const cursorDate = new Date(cursorPayload.value);
      conditions.push(
        or(
          lt(auditLogs.changedAt, cursorDate),
          and(
            eq(auditLogs.changedAt, cursorDate),
            lt(auditLogs.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.auditLogs.findMany({
      where: and(...conditions),
      with: {
        actor: {
          columns: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: (auditLogs, { desc }) => [
        desc(auditLogs.changedAt),
        desc(auditLogs.id),
      ],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as AuditLogResponse[],
      limit,
      (log) => log.changedAt,
    );
  }
}
