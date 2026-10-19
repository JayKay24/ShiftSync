import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, lt, or } from 'drizzle-orm';
import { schema } from '../schema';
import { notifications } from '../entities/notification.entity';
import type {
  Notification,
  NewNotification,
} from '../entities/notification.entity';
import {
  CursorPaginationParams,
  CursorPaginatedResponse,
} from '../api-interfaces';
import { clampLimit, decodeCursor, paginateResults } from '../pagination';

/**
 * Repository managing user notifications and read receipts.
 */
export class NotificationRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Persists a newly generated notification.
   *
   * @param {NewNotification} data - Notification payload including recipient user ID, type, and message.
   * @returns {Promise<Notification>} Newly created notification record.
   */
  async createNotification(data: NewNotification): Promise<Notification> {
    const [notification] = await this.db
      .insert(notifications)
      .values(data)
      .returning();

    return notification;
  }

  /**
   * Fetches paginated notifications for a recipient user ordered newest-first.
   *
   * @param {string} userId - Recipient user identifier.
   * @param {CursorPaginationParams} [pagination] - Pagination options including limit and cursor.
   * @returns {Promise<CursorPaginatedResponse<Notification>>} Paginated notifications list.
   */
  async getUserNotifications(
    userId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<Notification>> {
    const limit = clampLimit(pagination?.limit);
    const conditions = [eq(notifications.userId, userId)];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      const cursorDate = new Date(cursorPayload.value);
      conditions.push(
        or(
          lt(notifications.createdAt, cursorDate),
          and(
            eq(notifications.createdAt, cursorDate),
            lt(notifications.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);

    return paginateResults(rows, limit, (n) => n.createdAt);
  }

  /**
   * Marks a specific notification as read, ensuring ownership by the specified user.
   *
   * @param {string} notificationId - Identifier of the notification to mark read.
   * @param {string} userId - ID of the user owning the notification.
   * @returns {Promise<Notification | undefined>} Updated notification record, or undefined if not found.
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification | undefined> {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    return updated;
  }
}
