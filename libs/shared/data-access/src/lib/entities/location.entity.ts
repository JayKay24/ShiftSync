import { pgTable, uuid, text, varchar, integer } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  address: text("address"),
  scheduleEditCutoffHours: integer("schedule_edit_cutoff_hours").default(48).notNull(),
});

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;
