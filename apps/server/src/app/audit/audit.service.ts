import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, auditLogs } from '@shiftsync/data-access';
import { eq, and, gte, lte } from 'drizzle-orm';

@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async logChange<T>(
    actorId: string,
    entityType: string,
    entityId: string,
    oldState: T | null,
    newState: T | null
  ) {
    return this.db.insert(auditLogs).values({
      actorId,
      entityType,
      entityId,
      oldState,
      newState,
    }).returning();
  }

  async getLogsByEntity(entityType: string, entityId: string) {
    return this.db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ),
      with: {
        actor: {
          columns: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: (auditLogs, { asc }) => [asc(auditLogs.changedAt)],
    });
  }

  async getLogsInRange(startDate: Date, endDate: Date) {
    return this.db.query.auditLogs.findMany({
      where: and(
        gte(auditLogs.changedAt, startDate),
        lte(auditLogs.changedAt, endDate)
      ),
      with: {
        actor: {
          columns: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.changedAt)],
    });
  }
}
