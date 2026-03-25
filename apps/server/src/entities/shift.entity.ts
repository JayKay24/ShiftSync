import { pgTable, uuid, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { locations } from "./location.entity";
import { skills } from "./skill.entity";
import { users } from "./user.entity";

export const shiftStatusEnum = pgEnum("shift_status", [
  "draft",
  "published",
  "cancelled",
  "completed",
]);

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .references(() => locations.id)
    .notNull(),
  requiredSkillId: uuid("required_skill_id")
    .references(() => skills.id)
    .notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  headcountNeeded: integer("headcount_needed").default(1).notNull(),
  status: shiftStatusEnum("status").default("draft").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
});
