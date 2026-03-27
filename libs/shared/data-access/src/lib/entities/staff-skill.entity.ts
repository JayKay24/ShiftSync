import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user.entity";
import { skills } from "./skill.entity";

export const staffSkills = pgTable(
  "staff_skills",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    skillId: uuid("skill_id")
      .references(() => skills.id)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.skillId] }),
  ]
);

export const staffSkillsRelations = relations(staffSkills, ({ one }) => ({
  user: one(users, {
    fields: [staffSkills.userId],
    references: [users.id],
  }),
  skill: one(skills, {
    fields: [staffSkills.skillId],
    references: [skills.id],
  }),
}));
