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

  async logChange(
    actorId: string,
    entityType: string,
    entityId: string,
    oldState: any,
    newState: any
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
    return this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(auditLogs.changedAt);
  }

  async getLogsInRange(startDate: Date, endDate: Date) {
    return this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.changedAt, startDate),
          lte(auditLogs.changedAt, endDate)
        )
      )
      .orderBy(auditLogs.changedAt);
  }
}
