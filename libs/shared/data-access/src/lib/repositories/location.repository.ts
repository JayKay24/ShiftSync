import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { schema } from '../schema';
import { locations } from '../entities/location.entity';

export class LocationRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(locations);
  }

  async findAssignedToManager(userId: string) {
    const assigned = await this.db.query.managerLocations.findMany({
      where: eq(schema.managerLocations.userId, userId),
      with: {
        location: true
      }
    });
    return assigned.map(a => a.location);
  }
}
