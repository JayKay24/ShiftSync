import { Injectable, BadRequestException, NotFoundException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { SwapRepository, AssignmentRepository, ShiftRepository } from '@shiftsync/data-access';
import { addHours, subHours, isBefore } from 'date-fns';
import { ShiftsService } from './shifts.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class SwapService {
  constructor(
    private swapRepo: SwapRepository,
    private assignmentRepo: AssignmentRepository,
    private shiftRepo: ShiftRepository,
    @Inject(forwardRef(() => ShiftsService))
    private shiftsService: ShiftsService,
    private auditService: AuditService,
    private notificationService: NotificationService,
  ) {}

  async requestSwap(userId: string, shiftId: string, reason: string, targetUserId?: string) {
    // 1. Verify user is assigned to this shift
    const assignment = await this.assignmentRepo.findConfirmedByUserAndShift(userId, shiftId);

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this shift');
    }

    // 2. Edge Case: Max 3 pending requests
    const pendingCount = await this.swapRepo.getPendingCount(userId);

    if (pendingCount >= 3) {
      throw new BadRequestException('You cannot have more than 3 pending swap/drop requests');
    }

    // 3. Get shift details for expiration calculation
    const shift = await this.shiftRepo.findById(shiftId);

    if (!shift) throw new NotFoundException('Shift not found');

    // 4. Expiration: Drop requests expire 24 hours before the shift starts (Requirement #3)
    const now = new Date();
    const shiftStart = new Date(shift.startTime);
    const expiresAt = targetUserId 
      ? addHours(now, 48) // Peer swaps can have longer default (e.g. 48h)
      : subHours(shiftStart, 24); // Drops expire 24h before start

    if (isBefore(expiresAt, now)) {
      throw new BadRequestException('Shift is too close to its start time to initiate a swap/drop (24h cutoff)');
    }

    // 5. Create the request
    const request = await this.swapRepo.createSwapRequest({
      requestingUserId: userId,
      targetUserId,
      shiftId,
      reason,
      status: targetUserId ? 'pending_peer' : 'pending_manager', // Drops go straight to manager (or public pool)
      expiresAt,
    });

    // 6. Update the original assignment status
    await this.assignmentRepo.updateStatus(userId, shiftId, targetUserId ? 'pending_swap' : 'pending_drop');

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
    const request = await this.swapRepo.findById(requestId);

    if (!request || request.targetUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (request.status !== 'pending_peer') {
      throw new BadRequestException('Request is no longer pending peer acceptance');
    }

    // Update to pending manager approval
    const updatedRequest = await this.swapRepo.updateStatus(requestId, 'pending_manager');

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

  async declineSwap(userId: string, requestId: string) {
    const request = await this.swapRepo.findById(requestId);

    if (!request || request.targetUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (request.status !== 'pending_peer') {
      throw new BadRequestException('Request is no longer pending peer acceptance');
    }

    const updatedRequest = await this.swapRepo.updateStatus(requestId, 'rejected');

    // Revert original assignment to confirmed
    await this.assignmentRepo.updateStatus(request.requestingUserId, request.shiftId, 'confirmed');

    await this.auditService.logChange(userId, 'swap_request', requestId, request, updatedRequest);

    await this.notificationService.createNotification({
      userId: request.requestingUserId,
      type: 'swap_request_update',
      title: 'Swap Request Declined',
      message: 'Your swap request was declined by your colleague.',
      payload: { requestId },
    });

    return { message: 'Swap request declined' };
  }

  async cancelSwap(userId: string, requestId: string) {
    const request = await this.swapRepo.findById(requestId);

    if (!request || request.requestingUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (request.status !== 'pending_peer' && request.status !== 'pending_manager') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updatedRequest = await this.swapRepo.updateStatus(requestId, 'cancelled');

    // Revert assignment
    await this.assignmentRepo.updateStatus(userId, request.shiftId, 'confirmed');

    await this.auditService.logChange(userId, 'swap_request', requestId, request, updatedRequest);

    if (request.targetUserId) {
      await this.notificationService.createNotification({
        userId: request.targetUserId,
        type: 'swap_request_update',
        title: 'Swap Request Withdrawn',
        message: 'A colleague has withdrawn their swap request.',
        payload: { requestId },
      });
    }

    return { message: 'Swap request cancelled' };
  }

  async cancelPendingSwaps(shiftId: string, actorId: string, reason: string) {
    const pendingRequests = await this.swapRepo.findPendingByShiftId(shiftId);

    for (const request of pendingRequests) {
      // 1. Cancel the request
      const updatedRequest = await this.swapRepo.updateStatus(request.id, 'cancelled');

      // 2. Revert the original assignment to 'confirmed'
      await this.assignmentRepo.updateStatus(request.requestingUserId, shiftId, 'confirmed');

      // 3. Log and Notify
      await this.auditService.logChange(actorId, 'swap_request', request.id, request, updatedRequest);

      await this.notificationService.createNotification({
        userId: request.requestingUserId,
        type: 'swap_request_update',
        title: 'Swap Request Cancelled',
        message: `Your swap/drop request was automatically cancelled because the shift was modified. Reason: ${reason}`,
        payload: { requestId: request.id, shiftId },
      });

      if (request.targetUserId) {
        await this.notificationService.createNotification({
          userId: request.targetUserId,
          type: 'swap_request_update',
          title: 'Swap Request Cancelled',
          message: 'A swap request you were involved in was cancelled due to shift modification.',
          payload: { requestId: request.id, shiftId },
        });
      }
    }
  }

  async approveSwap(managerId: string, requestId: string, approve: boolean) {
    const request = await this.swapRepo.findById(requestId);

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'pending_manager') throw new BadRequestException('Request is not awaiting manager approval');

    if (!approve) {
      const rejectedRequest = await this.swapRepo.updateStatus(requestId, 'rejected');

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
    const compliance = await this.shiftsService.complianceService.checkCompliance(request.targetUserId, request.shiftId);
    if (compliance.hasHardBlock) {
      throw new BadRequestException(`Hard Block: ${compliance.warnings.join(', ')}`);
    }

    // Deactivate the old assignment
    const oldAssignment = await this.assignmentRepo.findByUserAndShift(request.requestingUserId, request.shiftId);

    if (!oldAssignment) throw new NotFoundException('Original assignment not found');

    const updatedOldAssignment = await this.assignmentRepo.updateStatus(request.requestingUserId, request.shiftId, 'swapped');

    // Create the NEW assignment for the target user
    const newAssignment = await this.assignmentRepo.createAssignment(request.shiftId, request.targetUserId);

    // Log the assignment update
    await this.auditService.logChange(
      managerId,
      'assignment',
      oldAssignment.id,
      oldAssignment,
      updatedOldAssignment
    );

    await this.auditService.logChange(
      managerId,
      'assignment',
      newAssignment.id,
      null,
      newAssignment
    );

    const finalRequest = await this.swapRepo.updateStatus(requestId, 'approved');

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

  async getSwapRequests(userId: string, role: string) {
    if (role === 'Admin' || role === 'Manager') {
      return this.swapRepo.getSwapRequestsForManager();
    }

    return this.swapRepo.getSwapRequestsForUser(userId);
  }
}
