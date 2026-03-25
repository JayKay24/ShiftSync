import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
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
