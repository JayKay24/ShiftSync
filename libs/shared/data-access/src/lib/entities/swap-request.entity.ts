import { pgTable, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./user.entity";
import { shifts } from "./shift.entity";
import { relations } from 'drizzle-orm';

export const swapStatusEnum = pgEnum("swap_status", [
  "pending_peer",
  "pending_manager",
  "approved",
  "rejected",
  "cancelled",
]);

export const swapRequests = pgTable("swap_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestingUserId: uuid("requesting_user_id")
    .references(() => users.id)
    .notNull(),
  targetUserId: uuid("target_user_id")
    .references(() => users.id), // Null for drop requests ("for grabs")
  shiftId: uuid("shift_id")
    .references(() => shifts.id)
    .notNull(),
  status: swapStatusEnum("status").default("pending_peer").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const swapRequestsRelations = relations(swapRequests, ({ one }) => ({
  requestingUser: one(users, {
    fields: [swapRequests.requestingUserId],
    references: [users.id],
    relationName: 'requestingUser',
  }),
  targetUser: one(users, {
    fields: [swapRequests.targetUserId],
    references: [users.id],
    relationName: 'targetUser',
  }),
  shift: one(shifts, {
    fields: [swapRequests.shiftId],
    references: [shifts.id],
  }),
}));
