import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { schema } from '../schema';
import { notifications } from '../entities/notification.entity';
import type { Notification, NewNotification } from '../entities/notification.entity';

export class NotificationRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async createNotification(data: NewNotification): Promise<Notification> {
    const [notification] = await this.db
      .insert(notifications)
      .values(data)
      .returning();
      
    return notification;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();
      
    return updated;
  }
}
