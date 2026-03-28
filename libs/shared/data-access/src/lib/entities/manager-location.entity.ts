import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./user.entity";
import { locations } from "./location.entity";
import { relations } from 'drizzle-orm';

export const managerLocations = pgTable("manager_locations", {
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  locationId: uuid("location_id")
    .references(() => locations.id, { onDelete: "cascade" })
    .notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.locationId] }),
}));

export const managerLocationsRelations = relations(managerLocations, ({ one }) => ({
  user: one(users, {
    fields: [managerLocations.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [managerLocations.locationId],
    references: [locations.id],
  }),
}));
