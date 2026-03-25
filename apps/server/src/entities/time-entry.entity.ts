import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { assignments } from "./assignment.entity";
import { users } from "./user.entity";
import { locations } from "./location.entity";

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
