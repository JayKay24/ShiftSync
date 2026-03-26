import { users, userRoleEnum, usersRelations } from "./entities/user.entity";
import { locations } from "./entities/location.entity";
import { skills, employeeSkillEnum } from "./entities/skill.entity";
import { staffCertifications, staffCertificationsRelations } from "./entities/staff-certification.entity";
import { staffSkills, staffSkillsRelations } from "./entities/staff-skill.entity";
import { availability, availabilityRelations } from "./entities/availability.entity";
import { shifts, shiftStatusEnum, shiftsRelations } from "./entities/shift.entity";
import { assignments, assignmentStatusEnum, assignmentsRelations } from "./entities/assignment.entity";
import { swapRequests, swapStatusEnum, swapRequestsRelations } from "./entities/swap-request.entity";
import { notifications, notificationTypeEnum } from "./entities/notification.entity";
import { notificationSettings } from "./entities/notification-setting.entity";
import { auditLogs } from "./entities/audit-log.entity";
import { complianceOverrides, overrideTypeEnum } from "./entities/compliance-override.entity";
import { timeEntries } from "./entities/time-entry.entity";

export const schema = {
  users,
  usersRelations,
  locations,
  skills,
  staffCertifications,
  staffCertificationsRelations,
  staffSkills,
  staffSkillsRelations,
  availability,
  availabilityRelations,
  shifts,
  shiftsRelations,
  assignments,
  assignmentsRelations,
  swapRequests,
  swapRequestsRelations,
  notifications,
  notificationSettings,
  auditLogs,
  complianceOverrides,
  timeEntries,
};

export const enums = {
  userRoleEnum,
  employeeSkillEnum,
  shiftStatusEnum,
  assignmentStatusEnum,
  swapStatusEnum,
  notificationTypeEnum,
  overrideTypeEnum,
};

export type Schema = typeof schema;
