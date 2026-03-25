import { pgTable, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { shifts } from "./shift.entity";
import { users } from "./user.entity";

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "confirmed",
  "pending_drop",
  "pending_swap",
]);

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id")
    .references(() => shifts.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  status: assignmentStatusEnum("status").default("confirmed").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
});
