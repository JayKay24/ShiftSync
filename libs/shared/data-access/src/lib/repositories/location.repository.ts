import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { schema } from '../schema';
import { locations } from '../entities/location.entity';

/**
 * Repository managing restaurant locations and manager location assignments.
 */
export class LocationRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Retrieves all active restaurant locations in the system.
   *
   * @returns {Promise<any[]>} List of all location records.
   */
  async findAll() {
    return this.db.select().from(locations);
  }

  /**
   * Retrieves all locations assigned to a specific manager.
   *
   * @param {string} userId - Manager's user identifier.
   * @returns {Promise<any[]>} List of assigned location records.
   */
  async findAssignedToManager(userId: string) {
    const assigned = await this.db.query.managerLocations.findMany({
      where: eq(schema.managerLocations.userId, userId),
      with: {
        location: true,
      },
    });
    return assigned.map((a) => a.location);
  }
}
