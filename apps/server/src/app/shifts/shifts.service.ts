import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  ShiftRepository,
  UserRepository,
  LocationRepository,
  SkillRepository,
  TimeEntryRepository,
  AssignmentRepository,
  DashboardRepository,
  CursorPaginationParams,
  CursorPaginatedResponse,
  StaffMemberResponse,
  ShiftResponse,
} from '@shiftsync/data-access';
import { NewShift } from '@shiftsync/data-access';
import { addHours, isBefore } from 'date-fns';
import { ComplianceService } from './compliance.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { SwapService } from './swap.service';

/**
 * Service managing shift scheduling, staff assignments, operational statistics, and 48-hour edit locks.
 */
@Injectable()
export class ShiftsService {
  constructor(
    private shiftRepo: ShiftRepository,
    private userRepo: UserRepository,
    private locationRepo: LocationRepository,
    private skillRepo: SkillRepository,
    private timeEntryRepo: TimeEntryRepository,
    private assignmentRepo: AssignmentRepository,
    private dashboardRepo: DashboardRepository,
    public complianceService: ComplianceService, // Export public so SwapService can use it
    private auditService: AuditService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => SwapService))
    private swapService: SwapService,
  ) {}

  /**
   * Retrieves locations accessible to the current user based on RBAC.
   * Admins see all locations; managers only see locations assigned to them.
   *
   * @param {string} userId - User identifier.
   * @param {string} role - User role ('Admin', 'Manager', or 'Staff').
   * @returns {Promise<any[]>} Accessible locations list.
   */
  async getLocations(userId: string, role: string) {
    if (role === 'Admin') {
      return this.locationRepo.findAll();
    }

    // For Managers, filter by assigned locations
    return this.locationRepo.findAssignedToManager(userId);
  }

  /**
   * Retrieves all certified skills configured across the system.
   *
   * @returns {Promise<any[]>} Skills list.
   */
  async getSkills() {
    return this.skillRepo.findAll();
  }

  /**
   * Retrieves paginated staff members, scoped by manager locations or all staff for Admins.
   *
   * @param {string} userId - Requesting user identifier.
   * @param {string} role - Requesting user role.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<StaffMemberResponse>>} Paginated staff members with skills and certifications.
   */
  async getStaff(
    userId: string,
    role: string,
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<StaffMemberResponse>> {
    if (role === 'Admin' || role === 'Staff') {
      return this.userRepo.findStaff(pagination);
    }

    // For Managers, filter staff who have certifications at their assigned locations
    const assignedLocations =
      await this.locationRepo.findAssignedToManager(userId);
    const locationIds = assignedLocations.map((al) => al.id);

    return this.userRepo.findStaffByLocations(locationIds, pagination);
  }

  /**
   * Finds qualified staff eligible to be assigned to a specific shift.
   * Filters out staff already assigned, lacking required skills/certifications, or having hard compliance blocks.
   *
   * @param {string} shiftId - Shift identifier.
   * @returns {Promise<Array<{ user: any; warnings: string[]; requiresOverride: boolean }>>} Eligible staff list.
   * @throws {NotFoundException} If the shift does not exist.
   */
  async findAvailableStaff(shiftId: string) {
    const shift = await this.shiftRepo.findById(shiftId);

    if (!shift) throw new NotFoundException('Shift not found');

    const qualifiedStaff =
      await this.userRepo.findQualifiedStaffWithAssignments(shiftId);

    const results = [];
    for (const user of qualifiedStaff) {
      // Finding 4: Don't suggest staff already assigned to this shift
      if (user.assignments && user.assignments.length > 0) continue;

      const isCertified = user.staffCertifications.some(
        (c: any) => c.locationId === shift.locationId,
      );
      const hasSkill = user.staffSkills.some(
        (s: any) => s.skillId === shift.requiredSkillId,
      );

      if (isCertified && hasSkill) {
        const compliance = await this.complianceService.checkCompliance(
          user.id,
          shiftId,
        );

        if (!compliance.hasHardBlock) {
          results.push({
            user,
            warnings: compliance.warnings,
            requiresOverride: compliance.requiresOverride,
          });
        }
      }
    }

    return results;
  }

  /**
   * Retrieves active time clock records for staff currently clocked in on-duty.
   *
   * @returns {Promise<any[]>} On-duty staff list with location and user info.
   */
  async getOnDutyStaff() {
    return this.timeEntryRepo.findOnDutyStaff();
  }

  /**
   * Computes dashboard KPI statistics (total staff, pending swaps, upcoming shifts) scoped by role and location.
   *
   * @param {string} userId - User identifier.
   * @param {string} role - User role ('Admin' or 'Manager').
   * @returns {Promise<{ totalStaff: number; pendingSwaps: number; upcomingShifts: number }>} Dashboard metrics.
   */
  async getDashboardStats(userId: string, role: string) {
    if (role === 'Manager') {
      const assignedLocations =
        await this.locationRepo.findAssignedToManager(userId);
      const locationIds = assignedLocations.map((al) => al.id);
      return this.dashboardRepo.getManagerStats(locationIds);
    }
    return this.dashboardRepo.getAdminStats();
  }

  /**
   * Retrieves all confirmed shift assignments for a specific user.
   *
   * @param {string} userId - User identifier.
   * @returns {Promise<any[]>} User assignments list.
   */
  async getUserAssignments(userId: string) {
    return this.assignmentRepo.getUserConfirmedAssignments(userId);
  }

  /**
   * Retrieves shifts matching optional date range, location, and keyset cursor pagination filters.
   *
   * @param {Object} filters - Search filters.
   * @param {Date} [filters.startDate] - Start timestamp filter.
   * @param {Date} [filters.endDate] - End timestamp filter.
   * @param {string} [filters.locationId] - Location filter.
   * @param {string} [filters.cursor] - Keyset pagination cursor token.
   * @param {number} [filters.limit] - Max items per page.
   * @returns {Promise<CursorPaginatedResponse<ShiftResponse>>} Paginated shifts with assignments and location details.
   */
  async getShifts(filters: {
    startDate?: Date;
    endDate?: Date;
    locationId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPaginatedResponse<ShiftResponse>> {
    return this.shiftRepo.findShiftsByFilters(filters);
  }

  /**
   * Fetches a single shift by ID with its confirmed staff assignments and user profiles.
   *
   * @param {string} id - Shift identifier.
   * @returns {Promise<any>} Shift record with eager-loaded assignments.
   * @throws {NotFoundException} If the shift does not exist.
   */
  async getShiftById(id: string) {
    const shift = await this.shiftRepo.findByIdWithAssignments(id);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  /**
   * Creates a new shift, automatically detecting and tagging Friday/Saturday evening shifts as premium.
   *
   * @param {NewShift} newShift - Shift creation data.
   * @returns {Promise<any>} Created shift record.
   */
  async createShift(newShift: NewShift) {
    // Requirement #5: Friday/Saturday evening shifts are premium
    // Assume evening starts at 6 PM (18:00)
    const startDate = new Date(newShift.startTime);
    const day = startDate.getUTCDay(); // 5 = Friday, 6 = Saturday
    const hours = startDate.getUTCHours();

    const isPremium = (day === 5 || day === 6) && hours >= 18;

    const result = await this.shiftRepo.createShift({
      ...newShift,
      isPremium: newShift.isPremium || isPremium,
    });

    // Log the creation
    await this.auditService.logChange(
      newShift.createdBy,
      'shift',
      result.id,
      null,
      result,
    );

    return result;
  }

  /**
   * Updates an existing shift, enforcing the 48-hour schedule lock rule unless performed by an Admin.
   * Automatically cancels pending shift swaps and notifies affected staff if critical fields change.
   *
   * @param {string} shiftId - Shift identifier.
   * @param {string} userId - Actor user identifier.
   * @param {string} role - Actor role ('Admin' or 'Manager').
   * @param {Partial<NewShift>} updates - Shift modifications.
   * @returns {Promise<any>} Updated shift record.
   * @throws {NotFoundException} If shift does not exist.
   * @throws {BadRequestException} If modifying within 48h lock window or past shifts as non-admin.
   */
  async updateShift(
    shiftId: string,
    userId: string,
    role: string,
    updates: Partial<NewShift>,
  ) {
    const oldShift = await this.shiftRepo.findById(shiftId);

    if (!oldShift) throw new NotFoundException('Shift not found');

    // Requirement #4: 48h schedule edit cutoff
    // Managers cannot edit or unpublish shifts within 48 hours of the start time.
    // Allow Admins to bypass this for emergency fixes.
    const SCHEDULE_EDIT_CUTOFF_HOURS = 48;
    const now = new Date();
    const cutoffTime = addHours(now, SCHEDULE_EDIT_CUTOFF_HOURS);

    const shiftStartTime = new Date(oldShift.startTime);

    if (role !== 'Admin') {
      if (
        isBefore(now, shiftStartTime) &&
        isBefore(shiftStartTime, cutoffTime)
      ) {
        throw new BadRequestException(
          `Shifts cannot be edited or unpublished within ${SCHEDULE_EDIT_CUTOFF_HOURS} hours of their start time.`,
        );
      }

      if (!isBefore(now, shiftStartTime)) {
        throw new BadRequestException('Past shifts cannot be edited.');
      }
    }

    const result = await this.shiftRepo.updateShift(shiftId, updates);

    // Log the change
    await this.auditService.logChange(
      userId,
      'shift',
      shiftId,
      oldShift,
      result,
    );

    // Requirement #2 & #7: Cancel pending swaps and notify staff if critical fields changed
    const criticalFields: (keyof NewShift)[] = [
      'startTime',
      'endTime',
      'locationId',
      'requiredSkillId',
    ];
    const changed = criticalFields.some(
      (f) =>
        updates[f] !== undefined &&
        (oldShift as any)[f] !== undefined &&
        updates[f]!.toString() !== (oldShift as any)[f]!.toString(),
    );

    if (changed) {
      await this.swapService.cancelPendingSwaps(
        shiftId,
        userId,
        'Shift details (time, location, or skill) were modified by a manager.',
      );
    }

    return result;
  }

  /**
   * Assigns a staff member to a shift, validating certifications, skills, capacity, and labor law compliance.
   *
   * @param {string} shiftId - Shift identifier.
   * @param {string} userId - Assigned staff user identifier.
   * @param {string} [managerId] - Assigning manager user identifier.
   * @param {string} [overrideReason] - Documented justification if a 7th consecutive day override is needed.
   * @returns {Promise<any>} Assignment record including compliance warnings.
   * @throws {NotFoundException} If shift is not found.
   * @throws {BadRequestException} If shift has passed, is full, user already assigned, lacks skills/certs, or has hard blocks.
   */
  async assignStaff(
    shiftId: string,
    userId: string,
    managerId?: string,
    overrideReason?: string,
  ) {
    // 1. Check if shift exists
    const shift = await this.shiftRepo.findById(shiftId);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // New Requirement: Cannot assign staff to shifts that happened in the past
    if (isBefore(new Date(shift.startTime), new Date())) {
      throw new BadRequestException(
        'Cannot assign staff to a shift that has already started or passed',
      );
    }

    // 2. Check if shift is already full
    const assignmentCount =
      await this.assignmentRepo.countConfirmedByShift(shiftId);

    if (assignmentCount >= shift.headcountNeeded) {
      throw new BadRequestException('Shift is already full');
    }

    // 3. Check if user is already assigned to this shift
    const existingAssignment = await this.assignmentRepo.findByUserAndShift(
      userId,
      shiftId,
    );

    if (existingAssignment) {
      throw new BadRequestException(
        'Staff member is already assigned to this shift',
      );
    }

    // 3. Constraint: Location Certification
    const isCertified = await this.userRepo.hasCertification(
      userId,
      shift.locationId,
    );

    if (!isCertified) {
      throw new BadRequestException(
        'Staff member is not certified for this location',
      );
    }

    // 4. Constraint: Skill Matching
    const hasSkill = await this.userRepo.hasSkill(
      userId,
      shift.requiredSkillId,
    );

    if (!hasSkill) {
      throw new BadRequestException(
        'Staff member does not have the required skill for this shift',
      );
    }

    // 5. Compliance Checks (Requirement #2 & #4)
    // This now covers: Double-booking, 10-hour rest, Availability, Daily/Weekly hours, Consecutive days
    const compliance = await this.complianceService.checkCompliance(
      userId,
      shiftId,
    );

    if (compliance.hasHardBlock) {
      throw new BadRequestException(
        `Hard Block: ${compliance.warnings.join(', ')}`,
      );
    }

    if (compliance.requiresOverride) {
      if (!overrideReason || !managerId) {
        throw new BadRequestException({
          message: 'Assignment requires manager override (7th consecutive day)',
          warnings: compliance.warnings,
          code: 'OVERRIDE_REQUIRED',
        });
      }
    }

    // 6. Create assignment
    const assignment = await this.assignmentRepo.createAssignment(
      shiftId,
      userId,
    );

    // 10. Log override if applicable
    if (compliance.requiresOverride && managerId && overrideReason) {
      await this.assignmentRepo.createComplianceOverride(
        assignment.id,
        managerId,
        overrideReason,
      );
    }

    // Log the assignment
    if (managerId) {
      await this.auditService.logChange(
        managerId,
        'assignment',
        assignment.id,
        null,
        assignment,
      );

      // Requirement #7: Notify staff of new assignment
      await this.notificationService.createNotification({
        userId,
        type: 'shift_assigned',
        title: 'New Shift Assigned',
        message: `You have been assigned to a shift starting at ${new Date(shift.startTime).toLocaleString()}.`,
        payload: { shiftId, assignmentId: assignment.id },
      });
    }

    return {
      ...assignment,
      warnings: compliance.warnings,
    };
  }
}
