import { pgTable, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { shifts } from "./shift.entity";
import { users } from "./user.entity";
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "confirmed",
  "pending_drop",
  "pending_swap",
  "swapped",
  "dropped",
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

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  shift: one(shifts, {
    fields: [assignments.shiftId],
    references: [shifts.id],
  }),
  user: one(users, {
    fields: [assignments.userId],
    references: [users.id],
  }),
}));

export type Assignment = InferSelectModel<typeof assignments>;
export type NewAssignment = InferInsertModel<typeof assignments>;
