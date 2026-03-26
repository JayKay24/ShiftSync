import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./user.entity";

export const notificationTypeEnum = pgEnum("notification_type", [
  "shift_assigned",
  "shift_modified",
  "shift_cancelled",
  "schedule_published",
  "swap_request_update",
  "swap_pending_approval",
  "overtime_warning",
  "availability_change",
  "conflict_alert",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
