import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, count, gte, lt, sql } from 'drizzle-orm';
import { schema } from '../schema';
import { swapRequests } from '../entities/swap-request.entity';
import {
  CursorPaginationParams,
  CursorPaginatedResponse,
  SwapRequestResponse,
} from '../api-interfaces';
import { clampLimit, decodeCursor, paginateResults } from '../pagination';

export class SwapRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getPendingCount(userId: string): Promise<number> {
    const [pendingCount] = await this.db
      .select({ value: count() })
      .from(swapRequests)
      .where(
        and(
          eq(swapRequests.requestingUserId, userId),
          or(
            eq(swapRequests.status, 'pending_peer'),
            eq(swapRequests.status, 'pending_manager'),
          ),
        ),
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
          or(
            eq(swapRequests.status, 'pending_peer'),
            eq(swapRequests.status, 'pending_manager'),
          ),
        ),
      );
  }

  async getSwapRequestsForManager(
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<SwapRequestResponse>> {
    const limit = clampLimit(pagination?.limit, 20);
    const now = new Date();
    const conditions = [
      eq(swapRequests.status, 'pending_manager'),
      or(
        sql`${swapRequests.expiresAt} IS NULL`,
        gte(swapRequests.expiresAt, now),
      )!,
    ];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      const cursorDate = new Date(cursorPayload.value);
      conditions.push(
        or(
          lt(swapRequests.createdAt, cursorDate),
          and(
            eq(swapRequests.createdAt, cursorDate),
            lt(swapRequests.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.swapRequests.findMany({
      where: and(...conditions),
      with: {
        shift: {
          with: {
            location: true,
          },
        },
        requestingUser: true,
        targetUser: true,
      },
      orderBy: (swapRequests, { desc }) => [
        desc(swapRequests.createdAt),
        desc(swapRequests.id),
      ],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as SwapRequestResponse[],
      limit,
      (item) => item.createdAt,
    );
  }

  async getSwapRequestsForUser(
    userId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<SwapRequestResponse>> {
    const limit = clampLimit(pagination?.limit, 20);
    const conditions = [
      or(
        eq(swapRequests.requestingUserId, userId),
        eq(swapRequests.targetUserId, userId),
      )!,
    ];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      const cursorDate = new Date(cursorPayload.value);
      conditions.push(
        or(
          lt(swapRequests.createdAt, cursorDate),
          and(
            eq(swapRequests.createdAt, cursorDate),
            lt(swapRequests.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.swapRequests.findMany({
      where: and(...conditions),
      with: {
        shift: {
          with: {
            location: true,
          },
        },
        requestingUser: true,
        targetUser: true,
      },
      orderBy: (swapRequests, { desc }) => [
        desc(swapRequests.createdAt),
        desc(swapRequests.id),
      ],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as SwapRequestResponse[],
      limit,
      (item) => item.createdAt,
    );
  }
}
