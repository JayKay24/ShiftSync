import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { assignments } from "./assignment.entity";
import { users } from "./user.entity";
import { relations } from 'drizzle-orm';

export const overrideTypeEnum = pgEnum("override_type", [
  "7th_consecutive_day",
  "overtime_manual",
]);

export const complianceOverrides = pgTable("compliance_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id")
    .references(() => assignments.id)
    .notNull(),
  managerId: uuid("manager_id")
    .references(() => users.id)
    .notNull(),
  overrideReason: text("override_reason").notNull(),
  overrideType: overrideTypeEnum("override_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const complianceOverridesRelations = relations(complianceOverrides, ({ one }) => ({
  assignment: one(assignments, {
    fields: [complianceOverrides.assignmentId],
    references: [assignments.id],
  }),
  manager: one(users, {
    fields: [complianceOverrides.managerId],
    references: [users.id],
  }),
}));
