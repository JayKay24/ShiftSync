import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationResponse, NotificationListResponse } from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(@Req() req): Promise<NotificationListResponse> {
    return this.notificationService.getUserNotifications(req.user.userId);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req): Promise<NotificationResponse> {
    return this.notificationService.markAsRead(id, req.user.userId);
  }
}
