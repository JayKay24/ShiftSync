import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./user.entity";
import { locations } from "./location.entity";

export const staffCertifications = pgTable(
  "staff_certifications",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    locationId: uuid("location_id")
      .references(() => locations.id)
      .notNull(),
    certifiedAt: timestamp("certified_at", { withTimezone: true }).defaultNow().notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.locationId] }),
  ]
);
