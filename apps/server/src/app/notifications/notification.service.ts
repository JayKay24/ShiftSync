import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  Notification,
  NewNotification,
  CursorPaginationParams,
  CursorPaginatedResponse,
} from '@shiftsync/data-access';
import { NotificationGateway } from './notification.gateway';

/**
 * Service managing user notifications, WebSocket push events, and read synchronization.
 */
@Injectable()
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository,
    private gateway: NotificationGateway,
  ) {}

  /**
   * Persists a new notification and broadcasts it in real-time to the recipient via WebSocket.
   *
   * @param {NewNotification} data - Notification creation payload.
   * @returns {Promise<Notification>} Created notification record.
   */
  async createNotification(data: NewNotification): Promise<Notification> {
    const notification = await this.notificationRepo.createNotification(data);

    // Requirement #6: Push real-time update
    this.gateway.sendToUser(notification.userId, 'notification', notification);

    return notification;
  }

  /**
   * Fetches paginated notifications for a recipient user ordered newest-first.
   *
   * @param {string} userId - Recipient user identifier.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<Notification>>} Paginated notifications.
   */
  async getUserNotifications(
    userId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<Notification>> {
    return this.notificationRepo.getUserNotifications(userId, pagination);
  }

  /**
   * Marks a notification as read and emits a real-time event to synchronize unread counts across client sessions.
   *
   * @param {string} notificationId - Notification identifier.
   * @param {string} userId - Recipient user identifier.
   * @returns {Promise<Notification>} Updated notification record.
   * @throws {Error} If notification is not found or not owned by user.
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const updated = await this.notificationRepo.markAsRead(
      notificationId,
      userId,
    );

    if (!updated) {
      throw new Error(
        `Notification ${notificationId} not found or not owned by user ${userId}`,
      );
    }

    // Requirement #6: Sync read status
    this.gateway.sendToUser(userId, 'notification_read', {
      id: notificationId,
    });

    return updated;
  }

  /**
   * Broadcasts a global schedule change event across all connected WebSocket clients.
   *
   * @param {string} message - Human-readable announcement of schedule change.
   * @returns {Promise<void>}
   */
  // Helper for Requirement #6 & #7
  async broadcastScheduleChange(message: string) {
    this.gateway.broadcast('schedule_update', {
      message,
      timestamp: new Date(),
    });
  }
}
