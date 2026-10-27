/**
 * @fileoverview API helper fixtures for fast BDD Given precondition setup and scenario isolation.
 * Interacts directly with the ShiftSync backend REST API (http://localhost:3001/api) to set up
 * isolated test state without slow UI form fills, and records created IDs for automated post-scenario cleanup.
 */

import axios, { AxiosInstance } from 'axios';
import { Pool } from 'pg';
import { getPersona, LOCATIONS, SKILLS } from './personas';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Token and user session cache to avoid repeated HTTP login overhead across steps.
 */
interface SessionCacheItem {
  token: string;
  user: Record<string, unknown>;
}

const sessionCache = new Map<string, SessionCacheItem>();

/**
 * Creates or retrieves a cached Axios instance authenticated as the given persona.
 *
 * @param {string} personaName - Name of the persona (e.g. "Bob", "Charlie").
 * @returns {Promise<{ client: AxiosInstance; token: string; user: Record<string, unknown> }>} Authenticated Axios client.
 */
export async function getApiClientForPersona(personaName: string): Promise<{
  client: AxiosInstance;
  token: string;
  user: Record<string, unknown>;
}> {
  const persona = getPersona(personaName);
  let session = sessionCache.get(persona.email);

  if (!session) {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: persona.email,
      pass: persona.pass,
    });
    session = {
      token: res.data.access_token,
      user: res.data.user,
    };
    sessionCache.set(persona.email, session);
  }

  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    },
  });

  return { client, token: session.token, user: session.user };
}

/**
 * Registry of dynamic entity IDs created during scenario execution for targeted cleanup.
 */
export class ScenarioStateManager {
  private createdShiftIds: string[] = [];
  private createdSwapIds: string[] = [];
  private profileSnapshots: Map<
    string,
    {
      firstName: string;
      lastName: string;
      email: string;
      desiredWeeklyHours: number;
    }
  > = new Map();

  /**
   * Records a shift ID for teardown.
   *
   * @param {string} id - Shift UUID.
   */
  public trackShift(id: string): void {
    this.createdShiftIds.push(id);
  }

  /**
   * Records a swap request ID for teardown.
   *
   * @param {string} id - Swap request UUID.
   */
  public trackSwap(id: string): void {
    this.createdSwapIds.push(id);
  }

  /**
   * Snapshots original profile information before modification.
   *
   * @param {string} personaName - Persona name.
   * @param {Object} profile - Original profile data.
   */
  public snapshotProfile(
    personaName: string,
    profile: {
      firstName: string;
      lastName: string;
      email: string;
      desiredWeeklyHours: number;
    },
  ): void {
    if (!this.profileSnapshots.has(personaName)) {
      this.profileSnapshots.set(personaName, profile);
    }
  }

  /**
   * Resets and surgically cleans up all tracked entities and restored state created during the scenario.
   */
  public async cleanup(): Promise<void> {
    // 1. Restore any modified user profiles
    for (const [personaName, original] of this.profileSnapshots.entries()) {
      try {
        const { client } = await getApiClientForPersona(personaName);
        await client.patch('/users/profile', original);
      } catch (err) {
        console.warn(`Failed to restore profile for ${personaName}:`, err);
      }
    }
    this.profileSnapshots.clear();

    // 2. Surgically delete created shifts and cascading records via direct SQL
    if (this.createdShiftIds.length > 0 && process.env.DATABASE_URL) {
      try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        await pool.query('DELETE FROM swap_requests WHERE shift_id = ANY($1)', [
          this.createdShiftIds,
        ]);
        await pool.query(
          `DELETE FROM compliance_overrides WHERE assignment_id IN (
            SELECT id FROM assignments WHERE shift_id = ANY($1)
          )`,
          [this.createdShiftIds],
        );
        await pool.query('DELETE FROM assignments WHERE shift_id = ANY($1)', [
          this.createdShiftIds,
        ]);
        await pool.query('DELETE FROM audit_logs WHERE entity_id = ANY($1)', [
          this.createdShiftIds,
        ]);
        await pool.query('DELETE FROM shifts WHERE id = ANY($1)', [
          this.createdShiftIds,
        ]);

        await pool.end();
      } catch (err) {
        console.warn('Surgical DB cleanup error:', err);
      }
    }
    this.createdShiftIds = [];
    this.createdSwapIds = [];
  }
}

/**
 * Creates an isolated shift via REST API with automated cleanup tracking.
 *
 * @param {string} creatorPersona - Name of Manager or Admin creating the shift.
 * @param {Object} params - Shift parameters.
 * @param {ScenarioStateManager} stateManager - Active scenario state tracker.
 * @returns {Promise<any>} The created shift record.
 */
export async function createShiftViaApi(
  creatorPersona: string,
  params: {
    locationName: string;
    skillName: string;
    startTime: Date;
    endTime: Date;
    headcountNeeded?: number;
    status?: 'draft' | 'published' | 'completed' | 'cancelled';
  },
  stateManager: ScenarioStateManager,
): Promise<Record<string, unknown>> {
  const { client } = await getApiClientForPersona(creatorPersona);
  const locationId = LOCATIONS[params.locationName];
  const skillId = SKILLS[params.skillName.toLowerCase()];

  if (!locationId || !skillId) {
    throw new Error(
      `Invalid location (${params.locationName}) or skill (${params.skillName}) for API shift creation.`,
    );
  }

  const res = await client.post('/shifts', {
    locationId,
    requiredSkillId: skillId,
    startTime: params.startTime.toISOString(),
    endTime: params.endTime.toISOString(),
    headcountNeeded: params.headcountNeeded ?? 1,
    status: params.status || 'published',
  });

  const createdShift = res.data;
  stateManager.trackShift(createdShift.id);
  return createdShift;
}

/**
 * Assigns staff to a shift via REST API with optional compliance override reason.
 *
 * @param {string} managerPersona - Name of manager assigning staff.
 * @param {string} shiftId - Target shift ID.
 * @param {string} staffPersona - Name of staff member being assigned.
 * @param {string} [overrideReason] - Optional documentation for labor compliance override.
 * @returns {Promise<any>} Assignment result.
 */
export async function assignStaffViaApi(
  managerPersona: string,
  shiftId: string,
  staffPersona: string,
  overrideReason?: string,
): Promise<Record<string, unknown>> {
  const { client } = await getApiClientForPersona(managerPersona);
  const staff = getPersona(staffPersona);

  const res = await client.post(`/shifts/${shiftId}/assign`, {
    userId: staff.id,
    overrideReason,
  });

  return res.data;
}

/**
 * Initiates a shift swap or open drop request via REST API.
 *
 * @param {string} requesterPersona - Staff member requesting swap.
 * @param {string} shiftId - Assigned shift ID.
 * @param {string} reason - Swap reason.
 * @param {string} [targetPersona] - Optional target colleague name.
 * @param {ScenarioStateManager} [stateManager] - State manager tracking the request.
 * @returns {Promise<Record<string, unknown>>} Created swap request.
 */
export async function createSwapRequestViaApi(
  requesterPersona: string,
  shiftId: string,
  reason: string,
  targetPersona?: string,
  stateManager?: ScenarioStateManager,
): Promise<Record<string, unknown>> {
  const { client } = await getApiClientForPersona(requesterPersona);
  const targetUserId = targetPersona ? getPersona(targetPersona).id : undefined;

  const res = await client.post('/swaps/request', {
    shiftId,
    reason,
    targetUserId,
  });

  const createdSwap = res.data;
  if (stateManager) {
    stateManager.trackSwap(createdSwap.id);
  }
  return createdSwap;
}
