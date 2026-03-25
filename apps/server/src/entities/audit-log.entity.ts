import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user.entity";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  oldState: jsonb("old_state"),
  newState: jsonb("new_state"),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
});
