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

export class AuditRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

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

  async getLogsByEntity(
    entityType: string,
    entityId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    const limit = clampLimit(pagination?.limit, 10);
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

  async getLogsInRange(
    startDate: Date,
    endDate: Date,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    const limit = clampLimit(pagination?.limit, 10);
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
