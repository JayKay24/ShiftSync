import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../schema';
import { skills } from '../entities/skill.entity';

export class SkillRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(skills);
  }
}
