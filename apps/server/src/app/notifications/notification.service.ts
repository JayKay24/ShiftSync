import { Injectable } from '@nestjs/common';
import { NotificationRepository, Notification, NewNotification } from '@shiftsync/data-access';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository,
    private gateway: NotificationGateway,
  ) {}

  async createNotification(
    data: NewNotification
  ): Promise<Notification> {
    const notification = await this.notificationRepo.createNotification(data);
    
    // Requirement #6: Push real-time update
    this.gateway.sendToUser(notification.userId, 'notification', notification);
    
    return notification;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return this.notificationRepo.getUserNotifications(userId, limit);
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const updated = await this.notificationRepo.markAsRead(notificationId, userId);
    
    if (!updated) {
      throw new Error(`Notification ${notificationId} not found or not owned by user ${userId}`);
    }
    
    // Requirement #6: Sync read status
    this.gateway.sendToUser(userId, 'notification_read', { id: notificationId });
    
    return updated;
  }

  // Helper for Requirement #6 & #7
  async broadcastScheduleChange(message: string) {
    this.gateway.broadcast('schedule_update', { message, timestamp: new Date() });
  }
}
