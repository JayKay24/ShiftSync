import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, count, gte, sql } from 'drizzle-orm';
import { schema } from '../schema';
import { swapRequests } from '../entities/swap-request.entity';

export class SwapRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getPendingCount(userId: string): Promise<number> {
    const [pendingCount] = await this.db
      .select({ value: count() })
      .from(swapRequests)
      .where(
        and(
          eq(swapRequests.requestingUserId, userId),
          or(eq(swapRequests.status, 'pending_peer'), eq(swapRequests.status, 'pending_manager'))
        )
      );
      
    return Number(pendingCount.value);
  }

  async createSwapRequest(data: {
    requestingUserId: string;
    targetUserId?: string;
    shiftId: string;
    reason?: string;
    status: string;
    expiresAt: Date;
  }) {
    const [request] = await this.db
      .insert(swapRequests)
      .values(data as any)
      .returning();
      
    return request;
  }

  async findById(requestId: string) {
    const [request] = await this.db
      .select()
      .from(swapRequests)
      .where(eq(swapRequests.id, requestId))
      .limit(1);
      
    return request || null;
  }

  async updateStatus(requestId: string, status: string) {
    const [request] = await this.db
      .update(swapRequests)
      .set({ status } as any)
      .where(eq(swapRequests.id, requestId))
      .returning();
      
    return request || null;
  }

  async findPendingByShiftId(shiftId: string) {
    return this.db
      .select()
      .from(swapRequests)
      .where(
        and(
          eq(swapRequests.shiftId, shiftId),
          or(eq(swapRequests.status, 'pending_peer'), eq(swapRequests.status, 'pending_manager'))
        )
      );
  }

  async getSwapRequestsForManager() {
    const now = new Date();
    return this.db.query.swapRequests.findMany({
      where: and(
        eq(swapRequests.status, 'pending_manager'),
        or(sql`${swapRequests.expiresAt} IS NULL`, gte(swapRequests.expiresAt, now))
      ),
      with: {
        shift: {
          with: {
            location: true,
          },
        },
        requestingUser: true,
        targetUser: true,
      },
    });
  }

  async getSwapRequestsForUser(userId: string) {
    return this.db.query.swapRequests.findMany({
      where: or(
        eq(swapRequests.requestingUserId, userId),
        eq(swapRequests.targetUserId, userId)
      ),
      with: {
        shift: {
          with: {
            location: true,
          },
        },
        requestingUser: true,
        targetUser: true,
      },
    });
  }
}
