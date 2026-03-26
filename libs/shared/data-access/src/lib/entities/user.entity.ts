import { pgTable, text, uuid, varchar, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const userRoleEnum = pgEnum("user_role", ["Admin", "Manager", "Staff"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 30 }).notNull(),
  lastName: varchar("last_name", { length: 30 }).notNull(),
  role: userRoleEnum("role").notNull(),
  desiredWeeklyHours: integer("desired_weekly_hours").default(40).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
