import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  locations,
  skills,
  users,
  staffSkills,
  staffCertifications,
  shifts,
  assignments,
  swapRequests,
  notifications,
  notificationSettings,
  auditLogs,
  complianceOverrides,
  timeEntries,
  availability,
  managerLocations,
} from '@shiftsync/data-access';

export async function clearDynamic(db: NodePgDatabase<typeof schema>) {
  console.log('Clearing dynamic data (shifts, assignments, etc.)...');
  await db.delete(complianceOverrides);
  await db.delete(timeEntries);
  await db.delete(swapRequests);
  await db.delete(assignments);
  await db.delete(shifts);
  await db.delete(notifications);
  await db.delete(auditLogs);
}

export async function clearAll(db: NodePgDatabase<typeof schema>) {
  await clearDynamic(db);
  console.log('Clearing base data (users, locations, etc.)...');
  await db.delete(notificationSettings);
  await db.delete(availability);
  await db.delete(staffCertifications);
  await db.delete(staffSkills);
  await db.delete(managerLocations);
  await db.delete(users);
  await db.delete(locations);
  await db.delete(skills);
}
