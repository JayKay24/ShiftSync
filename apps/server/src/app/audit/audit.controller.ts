import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  AuditLogResponse,
  AuditLogQuery,
  AuditLogQuerySchema,
  CursorPaginationParams,
  CursorPaginationQuerySchema,
  CursorPaginatedResponse,
  PaginatedAuditLogsResponseSchema,
  UuidSchema,
} from '@shiftsync/data-access';

/**
 * Controller providing immutable audit trail querying across schedule modifications.
 */
@ApiTags('Audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Retrieves paginated system modification logs within a specified date window.
   *
   * @param {AuditLogQuery} query - Date bounds and cursor pagination query parameters.
   * @returns {Promise<CursorPaginatedResponse<AuditLogResponse>>} Paginated audit records.
   */
  @Get()
  @Roles('Admin')
  @ApiOperation({ summary: 'List system audit logs within date range' })
  @ApiOkResponse({
    standardSchema: PaginatedAuditLogsResponseSchema,
    description: 'Paginated audit logs',
  })
  @SerializeOptions({ schema: PaginatedAuditLogsResponseSchema })
  async getLogs(
    @Query({ schema: AuditLogQuerySchema }) query: AuditLogQuery,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = query.endDate
      ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
      : new Date();

    return this.auditService.getLogsInRange(start, end, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /**
   * Retrieves paginated modification history for a specific entity.
   *
   * @param {string} entityType - Target entity domain name (e.g. 'shift', 'assignment').
   * @param {string} entityId - Target entity UUID.
   * @param {CursorPaginationParams} query - Cursor pagination parameters.
   * @returns {Promise<CursorPaginatedResponse<AuditLogResponse>>} Paginated entity history logs.
   */
  @Get('entity/:type/:id')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'List modification history for a specific entity' })
  @ApiOkResponse({
    standardSchema: PaginatedAuditLogsResponseSchema,
    description: 'Entity audit logs',
  })
  @SerializeOptions({ schema: PaginatedAuditLogsResponseSchema })
  async getLogsByEntity(
    @Param('type') entityType: string,
    @Param('id', { schema: UuidSchema }) entityId: string,
    @Query({ schema: CursorPaginationQuerySchema })
    query: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<AuditLogResponse>> {
    return this.auditService.getLogsByEntity(entityType, entityId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
