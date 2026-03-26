import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, swapRequests, assignments, shifts, NewShift } from '@shiftsync/data-access';
import { eq, and, or, count } from 'drizzle-orm';
import { ShiftsService } from './shifts.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class SwapService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private shiftsService: ShiftsService,
    private auditService: AuditService,
    private notificationService: NotificationService,
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

    // Log the creation
    await this.auditService.logChange(
      userId,
      'swap_request',
      request.id,
      null,
      request
    );

    if (targetUserId) {
      // Requirement #7: Notify peer of swap request
      await this.notificationService.createNotification({
        userId: targetUserId,
        type: 'swap_request_update',
        title: 'New Swap Request',
        message: 'A colleague has requested to swap a shift with you.',
        payload: { requestId: request.id, shiftId },
      });
    }

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
    const [updatedRequest] = await this.db
      .update(swapRequests)
      .set({ status: 'pending_manager' })
      .where(eq(swapRequests.id, requestId))
      .returning();

    // Log the acceptance
    await this.auditService.logChange(
      userId,
      'swap_request',
      requestId,
      request,
      updatedRequest
    );

    // Requirement #7: Notify original requester that peer accepted
    await this.notificationService.createNotification({
      userId: request.requestingUserId,
      type: 'swap_request_update',
      title: 'Swap Accepted by Peer',
      message: 'Your swap request was accepted by your colleague and is now awaiting manager approval.',
      payload: { requestId },
    });

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
      const [rejectedRequest] = await this.db
        .update(swapRequests)
        .set({ status: 'rejected' })
        .where(eq(swapRequests.id, requestId))
        .returning();

      // Log the rejection
      await this.auditService.logChange(
        managerId,
        'swap_request',
        requestId,
        request,
        rejectedRequest
      );

      // Requirement #7: Notify requester of rejection
      await this.notificationService.createNotification({
        userId: request.requestingUserId,
        type: 'swap_request_update',
        title: 'Swap Request Rejected',
        message: 'Your swap request was rejected by the manager.',
        payload: { requestId },
      });

      return { status: 'rejected' };
    }

    const newUserId = request.targetUserId || managerId; // If drop, who picked it up? (Implementation simplifies to targeted swaps for now)
    
    if (!request.targetUserId) {
        throw new BadRequestException('Public drop pick-up logic not implemented yet. Use targeted swaps.');
    }

    // IMPORTANT: Re-verify all constraints for the NEW person before finalizing
    // We reuse the logic from shiftsService.assignStaff
    await this.shiftsService.assignStaff(request.shiftId, request.targetUserId, managerId);

    // If successful, deactivate the old assignment
    const [oldAssignment] = await this.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.shiftId, request.shiftId), eq(assignments.userId, request.requestingUserId)))
      .limit(1);

    const [updatedOldAssignment] = await this.db
      .update(assignments)
      .set({ status: 'pending_swap' }) // Or delete/deactivate
      .where(and(eq(assignments.shiftId, request.shiftId), eq(assignments.userId, request.requestingUserId)))
      .returning();

    // Log the old assignment update
    await this.auditService.logChange(
      managerId,
      'assignment',
      oldAssignment.id,
      oldAssignment,
      updatedOldAssignment
    );

    const [finalRequest] = await this.db
      .update(swapRequests)
      .set({ status: 'approved' })
      .where(eq(swapRequests.id, requestId))
      .returning();

    // Log the final approval
    await this.auditService.logChange(
      managerId,
      'swap_request',
      requestId,
      request,
      finalRequest
    );

    // Requirement #7: Notify both parties of final approval
    await this.notificationService.createNotification({
      userId: request.requestingUserId,
      type: 'swap_request_update',
      title: 'Swap Request Approved',
      message: 'Your swap request has been approved by the manager.',
      payload: { requestId, shiftId: request.shiftId },
    });

    if (request.targetUserId) {
      await this.notificationService.createNotification({
        userId: request.targetUserId,
        type: 'swap_request_update',
        title: 'Swap Finalized',
        message: 'The shift swap has been approved and your schedule has been updated.',
        payload: { requestId, shiftId: request.shiftId },
      });
    }

    return { status: 'approved' };
  }
}
