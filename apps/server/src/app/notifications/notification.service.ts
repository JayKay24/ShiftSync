import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, notifications, Notification, NewNotification } from '@shiftsync/data-access';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async createNotification(
    data: NewNotification
  ): Promise<Notification> {
    const [notification] = await this.db
      .insert(notifications)
      .values(data)
      .returning();
    
    // Requirement #6 Hook: We will emit via Socket.io here in the next task
    
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

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
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
