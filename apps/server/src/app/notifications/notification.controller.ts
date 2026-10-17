import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  NotificationResponse,
  NotificationListResponse,
} from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(
    @Req() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationListResponse> {
    return this.notificationService.getUserNotifications(req.user.userId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Req() req,
  ): Promise<NotificationResponse> {
    return this.notificationService.markAsRead(id, req.user.userId);
  }
}
