import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, users } from '@shiftsync/data-access';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string; desiredWeeklyHours?: number }) {
    const [user] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
