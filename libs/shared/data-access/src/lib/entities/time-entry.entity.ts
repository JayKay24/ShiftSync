import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { assignments } from "./assignment.entity";
import { users } from "./user.entity";
import { locations } from "./location.entity";
import { relations } from 'drizzle-orm';

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id")
    .references(() => assignments.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  locationId: uuid("location_id")
    .references(() => locations.id)
    .notNull(),
});

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  assignment: one(assignments, {
    fields: [timeEntries.assignmentId],
    references: [assignments.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [timeEntries.locationId],
    references: [locations.id],
  }),
}));
