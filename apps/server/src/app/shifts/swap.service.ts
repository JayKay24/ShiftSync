import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import {
  SwapRepository,
  AssignmentRepository,
  ShiftRepository,
  CursorPaginationParams,
  CursorPaginatedResponse,
  SwapRequestResponse,
} from '@shiftsync/data-access';
import { addHours, subHours, isBefore } from 'date-fns';
import { ShiftsService } from './shifts.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

/**
 * Service managing peer shift swap workflows, drop requests, and manager approval lifecycles.
 */
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

  /**
   * Initiates a shift swap or drop request from an assigned staff member.
   * Enforces 3-request maximum limit, assignment ownership, and 24-hour shift start cutoff for drops.
   *
   * @param {string} userId - Requesting staff member user ID.
   * @param {string} shiftId - Target shift ID to be swapped or dropped.
   * @param {string} reason - Justification for the swap/drop request.
   * @param {string} [targetUserId] - Optional peer user ID for targeted peer-to-peer swap.
   * @returns {Promise<any>} Created swap request record.
   * @throws {ForbiddenException} If user is not assigned to the shift.
   * @throws {BadRequestException} If user already has 3 pending requests or cutoff window passed.
   * @throws {NotFoundException} If shift is not found.
   */
  async requestSwap(
    userId: string,
    shiftId: string,
    reason: string,
    targetUserId?: string,
  ) {
    // 1. Verify user is assigned to this shift
    const assignment = await this.assignmentRepo.findConfirmedByUserAndShift(
      userId,
      shiftId,
    );

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this shift');
    }

    // 2. Edge Case: Max 3 pending requests
    const pendingCount = await this.swapRepo.getPendingCount(userId);

    if (pendingCount >= 3) {
      throw new BadRequestException(
        'You cannot have more than 3 pending swap/drop requests',
      );
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
      throw new BadRequestException(
        'Shift is too close to its start time to initiate a swap/drop (24h cutoff)',
      );
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
    await this.assignmentRepo.updateStatus(
      userId,
      shiftId,
      targetUserId ? 'pending_swap' : 'pending_drop',
    );

    // Log the creation
    await this.auditService.logChange(
      userId,
      'swap_request',
      request.id,
      null,
      request,
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

  /**
   * Accepts a targeted swap request as the peer recipient and moves the request to manager review.
   *
   * @param {string} userId - Accepting peer's user ID.
   * @param {string} requestId - Swap request identifier.
   * @returns {Promise<{ message: string }>} Acceptance status message.
   * @throws {ForbiddenException} If user is not the designated target peer.
   * @throws {BadRequestException} If request is not in pending_peer status.
   */
  async acceptSwap(userId: string, requestId: string) {
    const request = await this.swapRepo.findById(requestId);

    if (!request || request.targetUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (request.status !== 'pending_peer') {
      throw new BadRequestException(
        'Request is no longer pending peer acceptance',
      );
    }

    // Update to pending manager approval
    const updatedRequest = await this.swapRepo.updateStatus(
      requestId,
      'pending_manager',
    );

    // Log the acceptance
    await this.auditService.logChange(
      userId,
      'swap_request',
      requestId,
      request,
      updatedRequest,
    );

    // Requirement #7: Notify original requester that peer accepted
    await this.notificationService.createNotification({
      userId: request.requestingUserId,
      type: 'swap_request_update',
      title: 'Swap Accepted by Peer',
      message:
        'Your swap request was accepted by your colleague and is now awaiting manager approval.',
      payload: { requestId },
    });

    return { message: 'Swap accepted, awaiting manager approval' };
  }

  /**
   * Declines a peer swap request and restores the requester's assignment to confirmed.
   *
   * @param {string} userId - Declining peer's user ID.
   * @param {string} requestId - Swap request identifier.
   * @returns {Promise<{ message: string }>} Status message confirming decline.
   * @throws {ForbiddenException} If user is not the designated target peer.
   * @throws {BadRequestException} If request is not in pending_peer status.
   */
  async declineSwap(userId: string, requestId: string) {
    const request = await this.swapRepo.findById(requestId);

    if (!request || request.targetUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (request.status !== 'pending_peer') {
      throw new BadRequestException(
        'Request is no longer pending peer acceptance',
      );
    }

    const updatedRequest = await this.swapRepo.updateStatus(
      requestId,
      'rejected',
    );

    // Revert original assignment to confirmed
    await this.assignmentRepo.updateStatus(
      request.requestingUserId,
      request.shiftId,
      'confirmed',
    );

    await this.auditService.logChange(
      userId,
      'swap_request',
      requestId,
      request,
      updatedRequest,
    );

    await this.notificationService.createNotification({
      userId: request.requestingUserId,
      type: 'swap_request_update',
      title: 'Swap Request Declined',
      message: 'Your swap request was declined by your colleague.',
      payload: { requestId },
    });

    return { message: 'Swap request declined' };
  }

  /**
   * Cancels a pending swap or drop request by the requesting user and restores assignment to confirmed.
   *
   * @param {string} userId - Requesting user's ID.
   * @param {string} requestId - Swap request identifier.
   * @returns {Promise<{ message: string }>} Status message.
   * @throws {ForbiddenException} If user is not the requester.
   * @throws {BadRequestException} If request is not in a pending state.
   */
  async cancelSwap(userId: string, requestId: string) {
    const request = await this.swapRepo.findById(requestId);

    if (!request || request.requestingUserId !== userId) {
      throw new ForbiddenException('Invalid swap request');
    }

    if (
      request.status !== 'pending_peer' &&
      request.status !== 'pending_manager'
    ) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updatedRequest = await this.swapRepo.updateStatus(
      requestId,
      'cancelled',
    );

    // Revert assignment
    await this.assignmentRepo.updateStatus(
      userId,
      request.shiftId,
      'confirmed',
    );

    await this.auditService.logChange(
      userId,
      'swap_request',
      requestId,
      request,
      updatedRequest,
    );

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

  /**
   * Automatically cancels all pending swap/drop requests associated with a shift when its critical details are modified.
   * Reverts original assignments to confirmed and notifies all affected staff members.
   *
   * @param {string} shiftId - Shift identifier.
   * @param {string} actorId - Modifying manager's user ID.
   * @param {string} reason - Cancellation rationale sent to affected staff.
   * @returns {Promise<void>}
   */
  async cancelPendingSwaps(shiftId: string, actorId: string, reason: string) {
    const pendingRequests = await this.swapRepo.findPendingByShiftId(shiftId);

    for (const request of pendingRequests) {
      // 1. Cancel the request
      const updatedRequest = await this.swapRepo.updateStatus(
        request.id,
        'cancelled',
      );

      // 2. Revert the original assignment to 'confirmed'
      await this.assignmentRepo.updateStatus(
        request.requestingUserId,
        shiftId,
        'confirmed',
      );

      // 3. Log and Notify
      await this.auditService.logChange(
        actorId,
        'swap_request',
        request.id,
        request,
        updatedRequest,
      );

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
          message:
            'A swap request you were involved in was cancelled due to shift modification.',
          payload: { requestId: request.id, shiftId },
        });
      }
    }
  }

  /**
   * Approves or rejects a shift swap request awaiting manager authorization.
   * On approval, verifies compliance constraints for the target user, reassigns the shift, and notifies both parties.
   *
   * @param {string} managerId - Authorizing manager's user ID.
   * @param {string} requestId - Swap request identifier.
   * @param {boolean} approve - True to approve and reassign, false to reject.
   * @returns {Promise<{ status: string }>} Final swap status ('approved' or 'rejected').
   * @throws {NotFoundException} If request or original assignment is not found.
   * @throws {BadRequestException} If request is not pending manager approval, or if target user violates compliance constraints.
   */
  async approveSwap(managerId: string, requestId: string, approve: boolean) {
    const request = await this.swapRepo.findById(requestId);

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'pending_manager')
      throw new BadRequestException('Request is not awaiting manager approval');

    if (!approve) {
      const rejectedRequest = await this.swapRepo.updateStatus(
        requestId,
        'rejected',
      );

      // Log the rejection
      await this.auditService.logChange(
        managerId,
        'swap_request',
        requestId,
        request,
        rejectedRequest,
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

    // If drop, who picked it up? (Implementation simplifies to targeted swaps for now)
    if (!request.targetUserId) {
      throw new BadRequestException(
        'Public drop pick-up logic not implemented yet. Use targeted swaps.',
      );
    }

    // IMPORTANT: Re-verify all constraints for the NEW person before finalizing
    const compliance =
      await this.shiftsService.complianceService.checkCompliance(
        request.targetUserId,
        request.shiftId,
      );
    if (compliance.hasHardBlock) {
      throw new BadRequestException(
        `Hard Block: ${compliance.warnings.join(', ')}`,
      );
    }

    // Deactivate the old assignment
    const oldAssignment = await this.assignmentRepo.findByUserAndShift(
      request.requestingUserId,
      request.shiftId,
    );

    if (!oldAssignment)
      throw new NotFoundException('Original assignment not found');

    const updatedOldAssignment = await this.assignmentRepo.updateStatus(
      request.requestingUserId,
      request.shiftId,
      'swapped',
    );

    // Create the NEW assignment for the target user
    const newAssignment = await this.assignmentRepo.createAssignment(
      request.shiftId,
      request.targetUserId,
    );

    // Log the assignment update
    await this.auditService.logChange(
      managerId,
      'assignment',
      oldAssignment.id,
      oldAssignment,
      updatedOldAssignment,
    );

    await this.auditService.logChange(
      managerId,
      'assignment',
      newAssignment.id,
      null,
      newAssignment,
    );

    const finalRequest = await this.swapRepo.updateStatus(
      requestId,
      'approved',
    );

    // Log the final approval
    await this.auditService.logChange(
      managerId,
      'swap_request',
      requestId,
      request,
      finalRequest,
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
        message:
          'The shift swap has been approved and your schedule has been updated.',
        payload: { requestId, shiftId: request.shiftId },
      });
    }

    return { status: 'approved' };
  }

  /**
   * Retrieves paginated swap requests, scoped to manager/admin oversight or user participation.
   *
   * @param {string} userId - Requesting user identifier.
   * @param {string} role - Requesting user role.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<SwapRequestResponse>>} Paginated swap requests.
   */
  async getSwapRequests(
    userId: string,
    role: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<SwapRequestResponse>> {
    if (role === 'Admin' || role === 'Manager') {
      return this.swapRepo.getSwapRequestsForManager(pagination);
    }

    return this.swapRepo.getSwapRequestsForUser(userId, pagination);
  }
}
