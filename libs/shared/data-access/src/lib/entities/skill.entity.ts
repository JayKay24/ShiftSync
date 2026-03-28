import { pgTable, uuid, pgEnum } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

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

export type Skill = InferSelectModel<typeof skills>;
export type NewSkill = InferInsertModel<typeof skills>;
