import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { schema } from '../schema';
import { staffCertifications } from '../entities/staff-certification.entity';
import { staffSkills } from '../entities/staff-skill.entity';
import { type NewUser, users } from '../entities/user.entity';
import { availability } from '../entities/availability.entity';

export class UserRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    return user || null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    
    return user || null;
  }

  async findStaff() {
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
          with: { location: true }
        },
        staffSkills: {
          with: { skill: true }
        }
      }
    });
  }

  async findStaffByLocations(locationIds: string[]) {
    if (locationIds.length === 0) return [];
    
    const users = await this.db.query.users.findMany({
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
          where: sql`${schema.staffCertifications.locationId} IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})`,
          with: { location: true }
        },
        staffSkills: {
          with: { skill: true }
        }
      }
    });
    
    return users.filter(u => u.staffCertifications.length > 0);
  }

  async findQualifiedStaffWithAssignments(shiftId: string) {
    return this.db.query.users.findMany({
      where: eq(schema.users.role, 'Staff'),
      with: {
        staffCertifications: true,
        staffSkills: true,
        assignments: {
          where: eq(schema.assignments.shiftId, shiftId),
        },
      },
    });
  }

  async hasCertification(userId: string, locationId: string): Promise<boolean> {
    const [cert] = await this.db
      .select()
      .from(staffCertifications)
      .where(
        and(
          eq(staffCertifications.userId, userId),
          eq(staffCertifications.locationId, locationId)
        )
      )
      .limit(1);
    
    return !!cert;
  }

  async hasSkill(userId: string, skillId: string): Promise<boolean> {
    const [skill] = await this.db
      .select()
      .from(staffSkills)
      .where(
        and(
          eq(staffSkills.userId, userId),
          eq(staffSkills.skillId, skillId)
        )
      )
      .limit(1);
    
    return !!skill;
  }

  async updateUser(userId: string, data: Partial<NewUser>) {
    const [user] = await this.db
      .update(schema.users)
      .set(data)
      .where(eq(schema.users.id, userId))
      .returning();
      
    return user || null;
  }
  async getUserAvailability(userId: string) {
    return this.db
      .select()
      .from(availability)
      .where(eq(availability.userId, userId));
  }
}
