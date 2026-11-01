import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Get,
  Query,
  Patch,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  AssignmentResult,
  AssignmentResultSchema,
  AvailableStaffResponse,
  AvailableStaffResponseSchema,
  OnDutyStaffResponse,
  OnDutyStaffResponseSchema,
  CreateShiftRequest,
  CreateShiftRequestSchema,
  UpdateShiftRequest,
  UpdateShiftRequestSchema,
  AssignStaffRequest,
  AssignStaffRequestSchema,
  StaffMemberResponse,
  ShiftResponse,
  ShiftResponseSchema,
  CursorPaginationParams,
  CursorPaginationQuerySchema,
  CursorPaginatedResponse,
  PaginatedStaffResponseSchema,
  PaginatedShiftsResponseSchema,
  DashboardStatsResponse,
  DashboardStatsResponseSchema,
  ShiftFilterQuery,
  ShiftFilterQuerySchema,
  LocationSchema,
  SkillSchema,
  UserAssignmentResponseSchema,
  UuidSchema,
  Location,
  Skill,
  UserAssignmentResponse,
} from '@shiftsync/data-access';

/**
 * Controller managing shift creation, schedule queries, staff assignments, and availability lookups.
 */
@ApiTags('Shifts')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  /**
   * Retrieves locations accessible to the requesting user.
   *
   * @param {any} req - Authenticated HTTP request containing actor JWT identity.
   * @returns {Promise<Location[]>} List of locations.
   */
  @Get('locations')
  @ApiOperation({ summary: 'List accessible locations' })
  @ApiOkResponse({
    standardSchema: z.array(LocationSchema),
    description: 'Accessible locations list',
  })
  @SerializeOptions({ schema: LocationSchema })
  async getLocations(@Req() req): Promise<Location[]> {
    return this.shiftsService.getLocations(req.user.userId, req.user.role);
  }

  /**
   * Retrieves all certified job skills recognized by the organization.
   *
   * @returns {Promise<Skill[]>} Master list of skills.
   */
  @Get('skills')
  @ApiOperation({ summary: 'List all skills' })
  @ApiOkResponse({
    standardSchema: z.array(SkillSchema),
    description: 'Master skills list',
  })
  @SerializeOptions({ schema: SkillSchema })
  async getSkills(): Promise<Skill[]> {
    return this.shiftsService.getSkills();
  }

  /**
   * Retrieves all confirmed assignments scheduled for the currently authenticated staff user.
   *
   * @param {any} req - Authenticated HTTP request containing actor identity.
   * @returns {Promise<UserAssignmentResponse[]>} List of shift assignments with location data.
   */
  @Get('my-assignments')
  @ApiOperation({ summary: 'List personal shift assignments' })
  @ApiOkResponse({
    standardSchema: z.array(UserAssignmentResponseSchema),
    description: 'Personal assignments list',
  })
  @SerializeOptions({ schema: UserAssignmentResponseSchema })
  async getMyAssignments(@Req() req): Promise<UserAssignmentResponse[]> {
    return this.shiftsService.getUserAssignments(req.user.userId);
  }

  /**
   * Retrieves paginated staff members authorized in manager locations or organization-wide.
   *
   * @param {any} req - Authenticated HTTP request.
   * @param {CursorPaginationParams} query - Cursor pagination parameters.
   * @returns {Promise<CursorPaginatedResponse<StaffMemberResponse>>} Paginated staff directory slice.
   */
  @Get('staff')
  @ApiOperation({ summary: 'List staff directory with skills and locations' })
  @ApiOkResponse({
    standardSchema: PaginatedStaffResponseSchema,
    description: 'Paginated staff list',
  })
  @SerializeOptions({ schema: PaginatedStaffResponseSchema })
  async getStaff(
    @Req() req,
    @Query({ schema: CursorPaginationQuerySchema })
    query: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<StaffMemberResponse>> {
    return this.shiftsService.getStaff(req.user.userId, req.user.role, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /**
   * Retrieves scheduled shift assignments for a specific staff member.
   *
   * @param {string} id - Staff user UUID.
   * @returns {Promise<UserAssignmentResponse[]>} List of confirmed assignments.
   */
  @Get('staff/:id/assignments')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'List shift assignments for a specific staff user' })
  @ApiOkResponse({
    standardSchema: z.array(UserAssignmentResponseSchema),
    description: 'Staff shift assignments list',
  })
  @SerializeOptions({ schema: UserAssignmentResponseSchema })
  async getStaffAssignments(
    @Param('id', { schema: UuidSchema }) id: string,
  ): Promise<UserAssignmentResponse[]> {
    return this.shiftsService.getUserAssignments(id);
  }

  /**
   * Retrieves high-level operational counts for dashboard KPI cards.
   *
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<DashboardStatsResponse>} Aggregated operational metrics.
   */
  @Get('stats')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Get operational dashboard counts' })
  @ApiOkResponse({
    standardSchema: DashboardStatsResponseSchema,
    description: 'Dashboard metrics',
  })
  @SerializeOptions({ schema: DashboardStatsResponseSchema })
  async getStats(@Req() req): Promise<DashboardStatsResponse> {
    return this.shiftsService.getDashboardStats(req.user.userId, req.user.role);
  }

  /**
   * Retrieves currently active on-duty staff clocked in across supervised locations.
   *
   * @returns {Promise<OnDutyStaffResponse[]>} Active on-duty staff entries.
   */
  @Get('on-duty')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Get currently on-duty staff' })
  @ApiOkResponse({
    standardSchema: z.array(OnDutyStaffResponseSchema),
    description: 'Active on-duty staff list',
  })
  @SerializeOptions({ schema: OnDutyStaffResponseSchema })
  async getOnDuty(): Promise<OnDutyStaffResponse[]> {
    const records = await this.shiftsService.getOnDutyStaff();
    return records.map((r) => ({
      id: r.id,
      user: r.user,
      location: r.location,
      clockIn: r.clockIn,
    }));
  }

  /**
   * Discovers qualified, available staff eligible to cover a scheduled shift.
   *
   * @param {string} id - Scheduled shift UUID.
   * @returns {Promise<AvailableStaffResponse[]>} Candidates with compliance warnings.
   */
  @Get(':id/available-staff')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Find available qualified staff for a shift' })
  @ApiOkResponse({
    standardSchema: z.array(AvailableStaffResponseSchema),
    description: 'Eligible candidates list',
  })
  @SerializeOptions({ schema: AvailableStaffResponseSchema })
  async getAvailable(
    @Param('id', { schema: UuidSchema }) id: string,
  ): Promise<AvailableStaffResponse[]> {
    const staff = await this.shiftsService.findAvailableStaff(id);
    return staff.map((s) => ({
      id: s.user.id,
      name: `${s.user.firstName} ${s.user.lastName}`,
      warnings: s.warnings,
      requiresOverride: s.requiresOverride,
    }));
  }

  /**
   * Retrieves paginated scheduled shifts matching date range and location criteria.
   *
   * @param {ShiftFilterQuery} query - Filter parameters.
   * @returns {Promise<CursorPaginatedResponse<ShiftResponse>>} Paginated shift slice.
   */
  @Get()
  @ApiOperation({ summary: 'List scheduled shifts with filters' })
  @ApiOkResponse({
    standardSchema: PaginatedShiftsResponseSchema,
    description: 'Paginated shifts list',
  })
  @SerializeOptions({ schema: PaginatedShiftsResponseSchema })
  async getAll(
    @Query({ schema: ShiftFilterQuerySchema }) query: ShiftFilterQuery,
  ): Promise<CursorPaginatedResponse<ShiftResponse>> {
    const effectiveStart = query.startDate || query.start;
    const effectiveEnd = query.endDate || query.end;
    return this.shiftsService.getShifts({
      startDate: effectiveStart ? new Date(effectiveStart) : undefined,
      endDate: effectiveEnd ? new Date(effectiveEnd) : undefined,
      locationId: query.locationId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /**
   * Retrieves a single shift by UUID.
   *
   * @param {string} id - Shift UUID.
   * @returns {Promise<ShiftResponse>} Detailed shift entity.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get shift details by ID' })
  @ApiOkResponse({
    standardSchema: ShiftResponseSchema,
    description: 'Shift entity',
  })
  @SerializeOptions({ schema: ShiftResponseSchema })
  async getOne(
    @Param('id', { schema: UuidSchema }) id: string,
  ): Promise<ShiftResponse> {
    return this.shiftsService.getShiftById(id);
  }

  /**
   * Creates a new scheduled shift.
   *
   * @param {CreateShiftRequest} createShiftDto - Validated shift creation payload.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<ShiftResponse>} Newly created shift record.
   */
  @Post()
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Create a new shift' })
  @ApiCreatedResponse({
    standardSchema: ShiftResponseSchema,
    description: 'Shift successfully created',
  })
  @SerializeOptions({ schema: ShiftResponseSchema })
  async create(
    @Body({ schema: CreateShiftRequestSchema })
    createShiftDto: CreateShiftRequest,
    @Req() req,
  ): Promise<ShiftResponse> {
    return this.shiftsService.createShift({
      ...createShiftDto,
      startTime: new Date(createShiftDto.startTime),
      endTime: new Date(createShiftDto.endTime),
      status: createShiftDto.status as any,
      createdBy: req.user.userId,
    });
  }

  /**
   * Assigns a staff member to a scheduled shift with labor compliance enforcement.
   *
   * @param {string} id - Shift UUID.
   * @param {AssignStaffRequest} assignStaffDto - Validated assignment payload.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<AssignmentResult>} Assignment result with advisory compliance warnings.
   */
  @Post(':id/assign')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Assign staff to a scheduled shift' })
  @ApiOkResponse({
    standardSchema: AssignmentResultSchema,
    description: 'Staff assigned successfully',
  })
  @SerializeOptions({ schema: AssignmentResultSchema })
  async assign(
    @Param('id', { schema: UuidSchema }) id: string,
    @Body({ schema: AssignStaffRequestSchema })
    assignStaffDto: AssignStaffRequest,
    @Req() req,
  ): Promise<AssignmentResult> {
    const res = await this.shiftsService.assignStaff(
      id,
      assignStaffDto.userId,
      req.user.userId,
      assignStaffDto.overrideReason,
    );
    return res as AssignmentResult;
  }

  /**
   * Updates an existing shift record while enforcing 48-hour schedule lock rules for managers.
   *
   * @param {string} id - Shift UUID.
   * @param {UpdateShiftRequest} updateDto - Validated partial update payload.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<ShiftResponse>} Updated shift entity.
   */
  @Patch(':id')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Update scheduled shift details' })
  @ApiOkResponse({
    standardSchema: ShiftResponseSchema,
    description: 'Shift updated successfully',
  })
  @SerializeOptions({ schema: ShiftResponseSchema })
  async update(
    @Param('id', { schema: UuidSchema }) id: string,
    @Body({ schema: UpdateShiftRequestSchema })
    updateDto: UpdateShiftRequest,
    @Req() req,
  ): Promise<ShiftResponse> {
    return this.shiftsService.updateShift(id, req.user.userId, req.user.role, {
      ...updateDto,
      startTime: updateDto.startTime
        ? new Date(updateDto.startTime)
        : undefined,
      endTime: updateDto.endTime ? new Date(updateDto.endTime) : undefined,
    } as any);
  }
}
