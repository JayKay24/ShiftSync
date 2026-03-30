import axios from 'axios';
import { execSync } from 'child_process';
import { addDays, setHours, startOfTomorrow, nextMonday, isMonday, addHours, startOfDay } from 'date-fns';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schema, complianceOverrides, timeEntries, swapRequests, assignments, shifts, notifications, auditLogs } from '@shiftsync/data-access';

export async function login(email: string, pass: string) {
  const res = await axios.post('/api/auth/login', { email, pass });
  return res.data.access_token;
}

/**
 * Quick cleanup of dynamic tables between tests if needed.
 * Unlike a full seed, this is safe to run frequently.
 */
export async function clearDynamicData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  await db.delete(complianceOverrides);
  await db.delete(timeEntries);
  await db.delete(swapRequests);
  await db.delete(assignments);
  await db.delete(shifts);
  await db.delete(notifications);
  await db.delete(auditLogs);
  
  await pool.end();
}

/**
 * Date Helpers for Relative Testing
 */
const BASE_FUTURE_DATE = addDays(startOfDay(new Date()), 100);

export const getFutureDate = (daysOffset: number) => {
  return addDays(BASE_FUTURE_DATE, daysOffset);
};

export const getSafeFutureDate = (daysAhead = 3) => {
  const date = addDays(new Date(), daysAhead);
  return setHours(date, 12);
};

export const getPastDate = (daysAgo = 1) => {
  const date = addDays(new Date(), -daysAgo);
  return setHours(date, 10);
};

export const getNextMonday = (baseDate = new Date()) => {
  return isMonday(baseDate) ? baseDate : nextMonday(baseDate);
};

export const getNextWednesday = (baseDate = new Date()) => {
  const mon = getNextMonday(baseDate);
  return addDays(mon, 2);
};

export const TEST_USERS = {
  admin: { email: 'admin@coastaleats.com', pass: 'password123' },
  manager: { email: 'bob.manager@coastaleats.com', pass: 'password123' },
  charlie: { email: 'charlie.staff@coastaleats.com', pass: 'password123' },
  dave: { email: 'dave.staff@coastaleats.com', pass: 'password123' },
  eva: { email: 'eva.staff@coastaleats.com', pass: 'password123' },
  frank: { email: 'frank.staff@coastaleats.com', pass: 'password123' },
};
