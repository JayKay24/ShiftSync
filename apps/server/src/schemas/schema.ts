import { users, userRoleEnum } from "../entities/user.entity";
import { locations } from "../entities/location.entity";
import { skills, employeeSkillEnum } from "../entities/skill.entity";
import { staffCertifications } from "../entities/staff-certification.entity";
import { staffSkills } from "../entities/staff-skill.entity";
import { availability } from "../entities/availability.entity";
import { shifts, shiftStatusEnum } from "../entities/shift.entity";
import { assignments, assignmentStatusEnum } from "../entities/assignment.entity";
import { swapRequests, swapStatusEnum } from "../entities/swap-request.entity";
import { notifications, notificationTypeEnum } from "../entities/notification.entity";
import { notificationSettings } from "../entities/notification-setting.entity";
import { auditLogs } from "../entities/audit-log.entity";
import { complianceOverrides, overrideTypeEnum } from "../entities/compliance-override.entity";
import { timeEntries } from "../entities/time-entry.entity";

export const schema = {
  users,
  locations,
  skills,
  staffCertifications,
  staffSkills,
  availability,
  shifts,
  assignments,
  swapRequests,
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
