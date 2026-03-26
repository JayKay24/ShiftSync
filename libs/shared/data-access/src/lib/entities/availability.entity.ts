import { pgTable, uuid, integer, time, boolean, date, check } from "drizzle-orm/pg-core";
import { users } from "./user.entity";
import { sql, relations } from "drizzle-orm";

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0-6
    startTimeLocal: time("start_time_local").notNull(),
    endTimeLocal: time("end_time_local").notNull(),
    isException: boolean("is_exception").default(false).notNull(),
    exceptionDate: date("exception_date"),
  },
  (table) => [
    check("day_of_week_check", sql`${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6`),
  ]
);

export const availabilityRelations = relations(availability, ({ one }) => ({
  user: one(users, {
    fields: [availability.userId],
    references: [users.id],
  }),
}));
