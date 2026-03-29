import { Injectable, Inject, BadRequestException, NotFoundException, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, shifts, assignments, staffSkills, staffCertifications, complianceOverrides, NewShift, locations, skills, Shift } from '@shiftsync/data-access';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import { ComplianceService } from './compliance.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { SwapService } from './swap.service';

@Injectable()
export class ShiftsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    public complianceService: ComplianceService, // Export public so SwapService can use it
    private auditService: AuditService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => SwapService))
    private swapService: SwapService,
  ) {}

  async getLocations(userId: string, role: string) {
    if (role === 'Admin') {
      return this.db.select().from(locations);
    }
    
    // For Managers, filter by assigned locations
    const assigned = await this.db.query.managerLocations.findMany({
      where: eq(schema.managerLocations.userId, userId),
      with: {
        location: true
      }
    });

    return assigned.map(a => a.location);
  }

  async getSkills() {
    return this.db.select().from(skills);
  }

  async getStaff() {
    return this.db.query.users.findMany({
      where: eq(schema.users.role, 'Staff'),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        timezone: true,
        desiredWeeklyHours: true,
      },
      with: {
        staffCertifications: {
          with: {
            location: true,
          }
        },
        staffSkills: {
          with: {
            skill: true,
          }
        }
      }
    });
  }

  async findAvailableStaff(shiftId: string) {
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!shift) throw new NotFoundException('Shift not found');

    const qualifiedStaff = await this.db.query.users.findMany({
      where: eq(schema.users.role, 'Staff'),
      with: {
        staffCertifications: true,
        staffSkills: true,
      },
    });

    const results = [];
    for (const user of qualifiedStaff) {
      const isCertified = user.staffCertifications.some(c => c.locationId === shift.locationId);
      const hasSkill = user.staffSkills.some(s => s.skillId === shift.requiredSkillId);

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
    return this.db.query.timeEntries.findMany({
      where: sql`${schema.timeEntries.clockOut} IS NULL`,
      with: {
        user: {
          columns: { id: true, firstName: true, lastName: true },
        },
        location: {
          columns: { id: true, name: true }
        },
      },
    });
  }

  async getDashboardStats() {
    const [staffCount] = await this.db
      .select({ value: count() })
      .from(schema.users)
      .where(eq(schema.users.role, 'Staff'));

    const [pendingSwapsCount] = await this.db
      .select({ value: count() })
      .from(schema.swapRequests)
      .where(eq(schema.swapRequests.status, 'pending_manager'));

    const [upcomingShiftsCount] = await this.db
      .select({ value: count() })
      .from(schema.shifts)
      .where(gte(schema.shifts.startTime, new Date()));

    return {
      totalStaff: Number(staffCount.value),
      pendingSwaps: Number(pendingSwapsCount.value),
      upcomingShifts: Number(upcomingShiftsCount.value),
    };
  }

  async getUserAssignments(userId: string) {
    return this.db.query.assignments.findMany({
      where: and(
        eq(assignments.userId, userId),
        eq(assignments.status, 'confirmed')
      ),
      with: {
        shift: {
          with: {
            location: true,
          }
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.id)], // Temporary sort, shift time would be better if possible via relations
    });
  }

  async getShifts(filters: { startDate?: Date; endDate?: Date; locationId?: string }) {
    const whereClauses = [];
    if (filters.startDate) whereClauses.push(gte(shifts.startTime, filters.startDate));
    if (filters.endDate) whereClauses.push(lte(shifts.endTime, filters.endDate));
    if (filters.locationId) whereClauses.push(eq(shifts.locationId, filters.locationId));

    return this.db.query.shifts.findMany({
      where: and(...whereClauses),
      with: {
        assignments: {
          where: eq(assignments.status, 'confirmed'),
          with: {
            user: true,
          },
        },
      },
      orderBy: [shifts.startTime],
    });
  }

  async getShiftById(id: string) {
    const shift = await this.db.query.shifts.findFirst({
      where: eq(shifts.id, id),
      with: {
        assignments: {
          where: eq(assignments.status, 'confirmed'),
        },
      },
    });

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

    const [result] = await this.db
      .insert(shifts)
      .values({
        ...newShift,
        isPremium: newShift.isPremium || isPremium,
      })
      .returning();

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
    const [oldShift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!oldShift) throw new NotFoundException('Shift not found');

    // Requirement #4: 48h schedule edit cutoff
    // Managers cannot edit or unpublish shifts within 48 hours of the start time.
    // Allow Admins to bypass this for emergency fixes.
    const SCHEDULE_EDIT_CUTOFF_HOURS = 48;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() + SCHEDULE_EDIT_CUTOFF_HOURS);

    if (role !== 'Admin' && new Date(oldShift.startTime) < cutoffTime) {
      throw new BadRequestException(`Shifts cannot be edited or unpublished within ${SCHEDULE_EDIT_CUTOFF_HOURS} hours of their start time.`);
    }

    const [result] = await this.db
      .update(shifts)
      .set(updates)
      .where(eq(shifts.id, shiftId))
      .returning();

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
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // New Requirement: Cannot assign staff to shifts that happened in the past
    if (new Date(shift.startTime) < new Date()) {
      throw new BadRequestException('Cannot assign staff to a shift that has already started or passed');
    }

    // 2. Check if shift is already full
    const [assignmentCount] = await this.db
      .select({ value: count() })
      .from(assignments)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'confirmed')));

    if (Number(assignmentCount.value) >= shift.headcountNeeded) {
      throw new BadRequestException('Shift is already full');
    }

    // 3. Check if user is already assigned to this shift
    const [existingAssignment] = await this.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId)))
      .limit(1);

    if (existingAssignment) {
      throw new BadRequestException('Staff member is already assigned to this shift');
    }

    // 3. Constraint: Location Certification
    const [isCertified] = await this.db
      .select()
      .from(staffCertifications)
      .where(
        and(
          eq(staffCertifications.userId, userId),
          eq(staffCertifications.locationId, shift.locationId)
        )
      )
      .limit(1);

    if (!isCertified) {
      throw new BadRequestException('Staff member is not certified for this location');
    }

    // 4. Constraint: Skill Matching
    const [hasSkill] = await this.db
      .select()
      .from(staffSkills)
      .where(
        and(
          eq(staffSkills.userId, userId),
          eq(staffSkills.skillId, shift.requiredSkillId)
        )
      )
      .limit(1);

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
    const [assignment] = await this.db
      .insert(assignments)
      .values({
        shiftId,
        userId,
        status: 'confirmed',
      })
      .returning();

    // 10. Log override if applicable
    if (compliance.requiresOverride && managerId && overrideReason) {
      await this.db.insert(complianceOverrides).values({
        assignmentId: assignment.id,
        managerId,
        overrideReason,
        overrideType: '7th_consecutive_day',
      });
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
