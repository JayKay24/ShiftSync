import { Injectable, Inject, BadRequestException, NotFoundException, forwardRef } from '@nestjs/common';
import {
  ShiftRepository,
  UserRepository,
  LocationRepository,
  SkillRepository,
  TimeEntryRepository,
  AssignmentRepository,
  DashboardRepository,
} from '@shiftsync/data-access';
import { NewShift } from '@shiftsync/data-access';
import { addHours, isBefore } from 'date-fns';
import { ComplianceService } from './compliance.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { SwapService } from './swap.service';

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

  async getLocations(userId: string, role: string) {
    if (role === 'Admin') {
      return this.locationRepo.findAll();
    }
    
    // For Managers, filter by assigned locations
    return this.locationRepo.findAssignedToManager(userId);
  }

  async getSkills() {
    return this.skillRepo.findAll();
  }

  async getStaff(userId: string, role: string) {
    if (role === 'Admin' || role === 'Staff') {
      return this.userRepo.findStaff();
    }

    // For Managers, filter staff who have certifications at their assigned locations
    const assignedLocations = await this.locationRepo.findAssignedToManager(userId);
    const locationIds = assignedLocations.map(al => al.id);

    return this.userRepo.findStaffByLocations(locationIds);
  }

  async findAvailableStaff(shiftId: string) {
    const shift = await this.shiftRepo.findById(shiftId);

    if (!shift) throw new NotFoundException('Shift not found');

    const qualifiedStaff = await this.userRepo.findQualifiedStaffWithAssignments(shiftId);

    const results = [];
    for (const user of qualifiedStaff) {
      // Finding 4: Don't suggest staff already assigned to this shift
      if (user.assignments && user.assignments.length > 0) continue;

      const isCertified = user.staffCertifications.some((c: any) => c.locationId === shift.locationId);
      const hasSkill = user.staffSkills.some((s: any) => s.skillId === shift.requiredSkillId);

      if (isCertified && hasSkill) {
        const compliance = await this.complianceService.checkCompliance(user.id, shiftId);
        
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

  async getOnDutyStaff() {
    return this.timeEntryRepo.findOnDutyStaff();
  }

  async getDashboardStats(userId: string, role: string) {
    if (role === 'Manager') {
      const assignedLocations = await this.locationRepo.findAssignedToManager(userId);
      const locationIds = assignedLocations.map(al => al.id);
      return this.dashboardRepo.getManagerStats(locationIds);
    }
    return this.dashboardRepo.getAdminStats();
  }

  async getUserAssignments(userId: string) {
    return this.assignmentRepo.getUserConfirmedAssignments(userId);
  }

  async getShifts(filters: { startDate?: Date; endDate?: Date; locationId?: string }) {
    return this.shiftRepo.findShiftsByFilters(filters);
  }

  async getShiftById(id: string) {
    const shift = await this.shiftRepo.findByIdWithAssignments(id);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

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
      result
    );

    return result;
  }

  async updateShift(shiftId: string, userId: string, role: string, updates: Partial<NewShift>) {
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
      if (isBefore(now, shiftStartTime) && isBefore(shiftStartTime, cutoffTime)) {
        throw new BadRequestException(`Shifts cannot be edited or unpublished within ${SCHEDULE_EDIT_CUTOFF_HOURS} hours of their start time.`);
      }
      
      if (!isBefore(now, shiftStartTime)) {
        throw new BadRequestException('Past shifts cannot be edited.');
      }
    }

    const result = await this.shiftRepo.updateShift(shiftId, updates);

    // Log the change
    await this.auditService.logChange(userId, 'shift', shiftId, oldShift, result);

    // Requirement #2 & #7: Cancel pending swaps and notify staff if critical fields changed
    const criticalFields: (keyof NewShift)[] = ['startTime', 'endTime', 'locationId', 'requiredSkillId'];
    const changed = criticalFields.some(f => updates[f] !== undefined && (oldShift as any)[f] !== undefined && updates[f]!.toString() !== (oldShift as any)[f]!.toString());

    if (changed) {
      await this.swapService.cancelPendingSwaps(shiftId, userId, 'Shift details (time, location, or skill) were modified by a manager.');
    }

    return result;
  }

  async assignStaff(shiftId: string, userId: string, managerId?: string, overrideReason?: string) {
    // 1. Check if shift exists
    const shift = await this.shiftRepo.findById(shiftId);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // New Requirement: Cannot assign staff to shifts that happened in the past
    if (isBefore(new Date(shift.startTime), new Date())) {
      throw new BadRequestException('Cannot assign staff to a shift that has already started or passed');
    }

    // 2. Check if shift is already full
    const assignmentCount = await this.assignmentRepo.countConfirmedByShift(shiftId);

    if (assignmentCount >= shift.headcountNeeded) {
      throw new BadRequestException('Shift is already full');
    }

    // 3. Check if user is already assigned to this shift
    const existingAssignment = await this.assignmentRepo.findByUserAndShift(userId, shiftId);

    if (existingAssignment) {
      throw new BadRequestException('Staff member is already assigned to this shift');
    }

    // 3. Constraint: Location Certification
    const isCertified = await this.userRepo.hasCertification(userId, shift.locationId);

    if (!isCertified) {
      throw new BadRequestException('Staff member is not certified for this location');
    }

    // 4. Constraint: Skill Matching
    const hasSkill = await this.userRepo.hasSkill(userId, shift.requiredSkillId);

    if (!hasSkill) {
      throw new BadRequestException('Staff member does not have the required skill for this shift');
    }

    // 5. Compliance Checks (Requirement #2 & #4)
    // This now covers: Double-booking, 10-hour rest, Availability, Daily/Weekly hours, Consecutive days
    const compliance = await this.complianceService.checkCompliance(userId, shiftId);

    if (compliance.hasHardBlock) {
      throw new BadRequestException(`Hard Block: ${compliance.warnings.join(', ')}`);
    }

    if (compliance.requiresOverride) {
      if (!overrideReason || !managerId) {
        throw new BadRequestException({
          message: 'Assignment requires manager override (7th consecutive day)',
          warnings: compliance.warnings,
          code: 'OVERRIDE_REQUIRED'
        });
      }
    }

    // 6. Create assignment
    const assignment = await this.assignmentRepo.createAssignment(shiftId, userId);

    // 10. Log override if applicable
    if (compliance.requiresOverride && managerId && overrideReason) {
      await this.assignmentRepo.createComplianceOverride(assignment.id, managerId, overrideReason);
    }

    // Log the assignment
    if (managerId) {
      await this.auditService.logChange(
        managerId,
        'assignment',
        assignment.id,
        null,
        assignment
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
