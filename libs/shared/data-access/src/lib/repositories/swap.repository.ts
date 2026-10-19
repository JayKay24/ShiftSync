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

/**
 * Repository encapsulating shift swap and drop request persistence, lifecycle status
 * transitions (pending_peer -> pending_manager -> approved/rejected/cancelled), and manager inbox queries.
 */
export class SwapRepository {
  /**
   * Initializes the repository with the Drizzle PostgreSQL database client.
   *
   * @param {NodePgDatabase<typeof schema>} db - Drizzle database instance aware of the ShiftSync schema.
   */
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Counts the number of active, unresolved swap and drop requests initiated by a staff member.
   * Used to enforce Business Rule #4: Maximum of 3 pending requests per staff member at any time.
   *
   * @param {string} userId - User UUID.
   * @returns {Promise<number>} Number of active pending swap/drop requests.
   */
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

  /**
   * Inserts a new swap or drop request into the database.
   *
   * @param {Object} data - Swap creation payload.
   * @param {string} data.requestingUserId - UUID of staff member initiating the request.
   * @param {string} [data.targetUserId] - Optional peer UUID for direct swaps (null for drop requests).
   * @param {string} data.shiftId - UUID of the shift being swapped or dropped.
   * @param {string} [data.reason] - Explanation note provided by requester.
   * @param {string} data.status - Initial lifecycle state ('pending_peer' or 'pending_manager').
   * @param {Date} data.expiresAt - Expiration timestamp (drops expire 24h before shift start).
   * @returns {Promise<typeof swapRequests.$inferSelect>} Newly created swap request record.
   */
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

  /**
   * Retrieves a single swap request record by its unique UUID.
   *
   * @param {string} requestId - Swap request UUID.
   * @returns {Promise<typeof swapRequests.$inferSelect | null>} Swap request or null if not found.
   */
  async findById(requestId: string) {
    const [request] = await this.db
      .select()
      .from(swapRequests)
      .where(eq(swapRequests.id, requestId))
      .limit(1);

    return request || null;
  }

  /**
   * Updates the lifecycle status of an existing swap request.
   *
   * @param {string} requestId - Swap request UUID.
   * @param {string} status - New status ('pending_manager', 'approved', 'rejected', 'cancelled').
   * @returns {Promise<typeof swapRequests.$inferSelect | null>} Updated swap request or null if not found.
   */
  async updateStatus(requestId: string, status: string) {
    const [request] = await this.db
      .update(swapRequests)
      .set({ status } as any)
      .where(eq(swapRequests.id, requestId))
      .returning();

    return request || null;
  }

  /**
   * Finds all active pending swap/drop requests associated with a shift.
   * Used for Regret Logic: automatically cancelling pending swaps if the manager modifies shift details.
   *
   * @param {string} shiftId - Shift UUID.
   * @returns {Promise<(typeof swapRequests.$inferSelect)[]>} List of active pending requests.
   */
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

  /**
   * Retrieves a cursor-paginated list of swap and drop requests awaiting manager approval.
   * Automatically filters out expired drop requests.
   *
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<SwapRequestResponse>>} Paginated pending requests for managers.
   */
  async getSwapRequestsForManager(
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<SwapRequestResponse>> {
    const limit = clampLimit(pagination?.limit);
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

  /**
   * Retrieves a cursor-paginated history of swap requests involving a specific staff member
   * as either the requester or target peer.
   *
   * @param {string} userId - User UUID.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<SwapRequestResponse>>} Paginated user swap request history.
   */
  async getSwapRequestsForUser(
    userId: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<SwapRequestResponse>> {
    const limit = clampLimit(pagination?.limit);
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
