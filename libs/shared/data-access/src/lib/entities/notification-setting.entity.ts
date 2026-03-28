import { pgTable, uuid, boolean } from "drizzle-orm/pg-core";
import { users } from "./user.entity";
import { relations } from 'drizzle-orm';

export const notificationSettings = pgTable("notification_settings", {
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .primaryKey(),
  emailEnabled: boolean("email_enabled").default(false).notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
});

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));
