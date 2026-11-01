import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  NotificationResponse,
  NotificationResponseSchema,
  NotificationListResponse,
  NotificationListResponseSchema,
  CursorPaginationParams,
  CursorPaginationQuerySchema,
  UuidSchema,
} from '@shiftsync/data-access';

/**
 * Controller handling user notifications and read receipt mutations.
 */
@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Retrieves paginated alerts and notification messages for the authenticated user.
   *
   * @param {any} req - Authenticated HTTP request containing actor identity.
   * @param {CursorPaginationParams} query - Cursor pagination parameters.
   * @returns {Promise<NotificationListResponse>} Paginated notifications slice.
   */
  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  @ApiOkResponse({
    standardSchema: NotificationListResponseSchema,
    description: 'Paginated notifications list',
  })
  @SerializeOptions({ schema: NotificationListResponseSchema })
  async getMyNotifications(
    @Req() req,
    @Query({ schema: CursorPaginationQuerySchema })
    query: CursorPaginationParams,
  ): Promise<NotificationListResponse> {
    return this.notificationService.getUserNotifications(req.user.userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /**
   * Marks a specific notification as read.
   *
   * @param {string} id - Notification UUID.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<NotificationResponse>} Updated notification entity.
   */
  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({
    standardSchema: NotificationResponseSchema,
    description: 'Notification marked as read',
  })
  @SerializeOptions({ schema: NotificationResponseSchema })
  async markAsRead(
    @Param('id', { schema: UuidSchema }) id: string,
    @Req() req,
  ): Promise<NotificationResponse> {
    return this.notificationService.markAsRead(id, req.user.userId);
  }
}
