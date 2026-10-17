import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  AuditLogResponse,
  CursorPaginatedResponse,
} from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('Admin')
  async getLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date();

    return this.auditService.getLogsInRange(start, end, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('entity/:type/:id')
  @Roles('Admin', 'Manager')
  async getLogsByEntity(
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    return this.auditService.getLogsByEntity(entityType, entityId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
