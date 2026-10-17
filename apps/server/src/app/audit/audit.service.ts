import { Injectable } from '@nestjs/common';
import {
  AuditRepository,
  CursorPaginationParams,
  CursorPaginatedResponse,
  AuditLogResponse,
} from '@shiftsync/data-access';

@Injectable()
export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

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

  async getLogsByEntity(
    entityType: string,
    entityId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    return this.auditRepo.getLogsByEntity(entityType, entityId, pagination);
  }

  async getLogsInRange(
    startDate: Date,
    endDate: Date,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    return this.auditRepo.getLogsInRange(startDate, endDate, pagination);
  }
}
