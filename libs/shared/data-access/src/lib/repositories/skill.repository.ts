import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../schema';
import { skills } from '../entities/skill.entity';

/**
 * Repository providing access to staff skills and qualifications (e.g. Bartender, Server).
 */
export class SkillRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Retrieves all certified skills configured in the system.
   *
   * @returns {Promise<any[]>} List of all skills.
   */
  async findAll() {
    return this.db.select().from(skills);
  }
}
