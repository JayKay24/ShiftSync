import { Injectable } from '@nestjs/common';
import { AuditRepository } from '@shiftsync/data-access';

@Injectable()
export class AuditService {
  constructor(
    private auditRepo: AuditRepository,
  ) {}

  async logChange<T>(
    actorId: string,
    entityType: string,
    entityId: string,
    oldState: T | null,
    newState: T | null
  ) {
    return this.auditRepo.logChange(actorId, entityType, entityId, oldState, newState);
  }

  async getLogsByEntity(entityType: string, entityId: string) {
    return this.auditRepo.getLogsByEntity(entityType, entityId);
  }

  async getLogsInRange(startDate: Date, endDate: Date) {
    return this.auditRepo.getLogsInRange(startDate, endDate);
  }
}
