import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, shifts, assignments, staffSkills, staffCertifications, complianceOverrides, NewShift, locations, skills } from '@shiftsync/data-access';
import { eq, and, gte, lte } from 'drizzle-orm';
import { ComplianceService } from './compliance.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ShiftsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private complianceService: ComplianceService,
    private auditService: AuditService,
    private notificationService: NotificationService,
  ) {}

  async getLocations() {
    return this.db.select().from(locations);
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
      },
    });
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

    // 2. Check if user is already assigned to this shift
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

    // 5. Get all existing shifts for this user to check temporal constraints
    const userAssignments = await this.db
      .select({
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(and(eq(assignments.userId, userId), eq(assignments.status, 'confirmed')));

    for (const existing of userAssignments) {
      const existingStart = new Date(existing.startTime).getTime();
      const existingEnd = new Date(existing.endTime).getTime();
      const newStart = new Date(shift.startTime).getTime();
      const newEnd = new Date(shift.endTime).getTime();

      // 6. Constraint: No Double-Booking (Overlapping)
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new BadRequestException('Staff member has an overlapping shift');
      }

      // 7. Constraint: Minimum 10-hour rest
      const restPeriodMs = 10 * 60 * 60 * 1000;
      if (existingEnd > newStart - restPeriodMs && existingEnd <= newStart) {
        throw new BadRequestException('Minimum 10-hour rest period required between shifts');
      }
      if (existingStart < newEnd + restPeriodMs && existingStart >= newEnd) {
        throw new BadRequestException('Minimum 10-hour rest period required between shifts');
      }
    }

    // 8. Compliance Checks (Requirement #4)
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

    // 9. Create assignment
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
