import { pgTable, uuid, pgEnum } from "drizzle-orm/pg-core";

export const employeeSkillEnum = pgEnum("employee_skill", [
  "bartender",
  "line_cook",
  "server",
  "host",
]);

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: employeeSkillEnum("name").unique().notNull(),
});
