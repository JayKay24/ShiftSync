/**
 * @fileoverview Persona catalog and domain entity identifier mappings for ShiftSync BDD test suites.
 * Maps user-friendly persona names used in Gherkin scenarios to seeded database entities.
 */

/**
 * Persona metadata representation for authentication and scenario context.
 */
export interface Persona {
  /** System identifier matching seeded user record. */
  id: string;
  /** Primary login email. */
  email: string;
  /** Standard test user password. */
  pass: string;
  /** First name of the persona. */
  firstName: string;
  /** Last name of the persona. */
  lastName: string;
  /** Role determining access permissions and default landing dashboard. */
  role: 'Admin' | 'Manager' | 'Staff';
  /** Default post-login dashboard route. */
  dashboardPath: string;
}

/**
 * Canonical test personas matching database seed data.
 */
export const PERSONAS: Record<string, Persona> = {
  Alice: {
    id: '33333333-3333-4333-8333-333333333330',
    email: 'admin@coastaleats.com',
    pass: 'password123',
    firstName: 'Alice',
    lastName: 'Admin',
    role: 'Admin',
    dashboardPath: '/dashboard/manager',
  },
  Bob: {
    id: '33333333-3333-4333-8333-333333333331',
    email: 'bob.manager@coastaleats.com',
    pass: 'password123',
    firstName: 'Bob',
    lastName: 'Manager',
    role: 'Manager',
    dashboardPath: '/dashboard/manager',
  },
  Diana: {
    id: '33333333-3333-4333-8333-333333333336',
    email: 'diana.manager@coastaleats.com',
    pass: 'password123',
    firstName: 'Diana',
    lastName: 'Manager',
    role: 'Manager',
    dashboardPath: '/dashboard/manager',
  },
  Charlie: {
    id: '33333333-3333-4333-8333-333333333332',
    email: 'charlie.staff@coastaleats.com',
    pass: 'password123',
    firstName: 'Charlie',
    lastName: 'Staff',
    role: 'Staff',
    dashboardPath: '/dashboard/staff',
  },
  Dave: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'dave.staff@coastaleats.com',
    pass: 'password123',
    firstName: 'Dave',
    lastName: 'Staff',
    role: 'Staff',
    dashboardPath: '/dashboard/staff',
  },
  Eva: {
    id: '33333333-3333-4333-8333-333333333334',
    email: 'eva.staff@coastaleats.com',
    pass: 'password123',
    firstName: 'Eva',
    lastName: 'Staff',
    role: 'Staff',
    dashboardPath: '/dashboard/staff',
  },
  Frank: {
    id: '33333333-3333-4333-8333-333333333335',
    email: 'frank.staff@coastaleats.com',
    pass: 'password123',
    firstName: 'Frank',
    lastName: 'Staff',
    role: 'Staff',
    dashboardPath: '/dashboard/staff',
  },
  Grace: {
    id: '33333333-3333-4333-8333-333333333337',
    email: 'grace.staff@coastaleats.com',
    pass: 'password123',
    firstName: 'Grace',
    lastName: 'Staff',
    role: 'Staff',
    dashboardPath: '/dashboard/staff',
  },
  Heidi: {
    id: '33333333-3333-4333-8333-333333333338',
    email: 'heidi.staff@coastaleats.com',
    pass: 'password123',
    firstName: 'Heidi',
    lastName: 'Staff',
    role: 'Staff',
    dashboardPath: '/dashboard/staff',
  },
};

/**
 * Seeded restaurant location UUIDs and names.
 */
export const LOCATIONS: Record<string, string> = {
  'Coastal Eats - Downtown': '11111111-1111-4111-8111-111111111111',
  'Coastal Eats - Uptown': '11111111-1111-4111-8111-111111111112',
  'The Beach Grill': '11111111-1111-4111-8111-111111111113',
};

/**
 * Seeded skill UUIDs and names.
 */
export const SKILLS: Record<string, string> = {
  bartender: '22222222-2222-4222-8222-222222222221',
  line_cook: '22222222-2222-4222-8222-222222222222',
  server: '22222222-2222-4222-8222-222222222223',
  host: '22222222-2222-4222-8222-222222222224',
};

/**
 * Retrieves a persona definition by case-insensitive name.
 *
 * @param {string} name - The persona name (e.g. "Bob", "charlie").
 * @returns {Persona} Matching persona definition.
 * @throws {Error} When the persona name is unknown.
 */
export function getPersona(name: string): Persona {
  const normalized = Object.keys(PERSONAS).find(
    (key) => key.toLowerCase() === name.trim().toLowerCase(),
  );
  if (!normalized) {
    throw new Error(
      `Unknown persona "${name}". Available personas: ${Object.keys(
        PERSONAS,
      ).join(', ')}`,
    );
  }
  return PERSONAS[normalized];
}
