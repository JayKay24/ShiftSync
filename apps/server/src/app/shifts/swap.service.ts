import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, swapRequests, assignments, shifts, NewShift } from '@shiftsync/data-access';
import { eq, and, or, count } from 'drizzle-orm';
import { ShiftsService } from './shifts.service';

@Injectable()
export class SwapService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private shiftsService: ShiftsService,
  ) {}

  async requestSwap(userId: string, shiftId: string, targetUserId?: string) {
    // 1. Verify user is assigned to this shift
    const [assignment] = await this.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId), eq(assignments.status, 'confirmed')))
      .limit(1);

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this shift');
    }

    // 2. Edge Case: Max 3 pending requests
    const [pendingCount] = await this.db
      .select({ value: count() })
      .from(swapRequests)
      .where(
        and(
          eq(swapRequests.requestingUserId, userId),
          or(eq(swapRequests.status, 'pending_peer'), eq(swapRequests.status, 'pending_manager'))
        )
      );

    if (Number(pendingCount.value) >= 3) {
      throw new BadRequestException('You cannot have more than 3 pending swap/drop requests');
    }

    // 3. Create the request
    const [request] = await this.db
      .insert(swapRequests)
      .values({
        requestingUserId: userId,
        targetUserId,
        shiftId,
        status: targetUserId ? 'pending_peer' : 'pending_manager', // Drops go straight to manager
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h expiry
      })
      .returning();

    return request;
  }

  async acceptSwap(userId: string, requestId: string) {
    const [request] = await this.db
      .select()
      .from(swapRequests)
      .where(eq(swapRequests.id, requestId))
      .limit(1);

    if (!request || request.targetUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (request.status !== 'pending_peer') {
      throw new BadRequestException('Request is no longer pending peer acceptance');
    }

    // Update to pending manager approval
    await this.db
      .update(swapRequests)
      .set({ status: 'pending_manager' })
      .where(eq(swapRequests.id, requestId));

    return { message: 'Swap accepted, awaiting manager approval' };
  }

  async approveSwap(managerId: string, requestId: string, approve: boolean) {
    const [request] = await this.db
      .select()
      .from(swapRequests)
      .where(eq(swapRequests.id, requestId))
      .limit(1);

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'pending_manager') throw new BadRequestException('Request is not awaiting manager approval');

    if (!approve) {
      await this.db.update(swapRequests).set({ status: 'rejected' }).where(eq(swapRequests.id, requestId));
      return { status: 'rejected' };
    }

    const newUserId = request.targetUserId || managerId; // If drop, who picked it up? (Implementation simplifies to targeted swaps for now)
    
    if (!request.targetUserId) {
        throw new BadRequestException('Public drop pick-up logic not implemented yet. Use targeted swaps.');
    }

    // IMPORTANT: Re-verify all constraints for the NEW person before finalizing
    // We reuse the logic from shiftsService.assignStaff
    await this.shiftsService.assignStaff(request.shiftId, request.targetUserId);

    // If successful, deactivate the old assignment
    await this.db
      .update(assignments)
      .set({ status: 'pending_swap' }) // Or delete/deactivate
      .where(and(eq(assignments.shiftId, request.shiftId), eq(assignments.userId, request.requestingUserId)));

    await this.db
      .update(swapRequests)
      .set({ status: 'approved' })
      .where(eq(swapRequests.id, requestId));

    return { status: 'approved' };
  }
}
