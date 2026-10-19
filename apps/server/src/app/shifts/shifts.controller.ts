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
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Shift,
  AssignmentResult,
  AvailableStaffResponse,
  OnDutyStaffResponse,
  CreateShiftRequest,
  UpdateShiftRequest,
  AssignStaffRequest,
  StaffMemberResponse,
  ShiftResponse,
  CursorPaginatedResponse,
} from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('locations')
  async getLocations(@Req() req) {
    return this.shiftsService.getLocations(req.user.userId, req.user.role);
  }

  @Get('skills')
  async getSkills() {
    return this.shiftsService.getSkills();
  }

  @Get('my-assignments')
  async getMyAssignments(@Req() req) {
    return this.shiftsService.getUserAssignments(req.user.userId);
  }

  @Get('staff')
  async getStaff(
    @Req() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<CursorPaginatedResponse<StaffMemberResponse>> {
    return this.shiftsService.getStaff(req.user.userId, req.user.role, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('staff/:id/assignments')
  @Roles('Admin', 'Manager')
  async getStaffAssignments(@Param('id') id: string) {
    return this.shiftsService.getUserAssignments(id);
  }

  @Get('stats')
  @Roles('Admin', 'Manager')
  async getStats(@Req() req) {
    return this.shiftsService.getDashboardStats(req.user.userId, req.user.role);
  }

  @Get('on-duty')
  @Roles('Admin', 'Manager')
  async getOnDuty(): Promise<OnDutyStaffResponse[]> {
    const records = await this.shiftsService.getOnDutyStaff();
    return records.map((r) => ({
      id: r.id,
      user: r.user,
      location: r.location,
      clockIn: r.clockIn,
    }));
  }

  @Get(':id/available-staff')
  @Roles('Admin', 'Manager')
  async getAvailable(
    @Param('id') id: string,
  ): Promise<AvailableStaffResponse[]> {
    const staff = await this.shiftsService.findAvailableStaff(id);
    return staff.map((s) => ({
      id: s.user.id,
      name: `${s.user.firstName} ${s.user.lastName}`,
      warnings: s.warnings,
      requiresOverride: s.requiresOverride,
    }));
  }

  @Get()
  async getAll(
    @Query('startDate') startDate?: string,
    @Query('start') start?: string,
    @Query('endDate') endDate?: string,
    @Query('end') end?: string,
    @Query('locationId') locationId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<CursorPaginatedResponse<ShiftResponse>> {
    const effectiveStart = startDate || start;
    const effectiveEnd = endDate || end;
    return this.shiftsService.getShifts({
      startDate: effectiveStart ? new Date(effectiveStart) : undefined,
      endDate: effectiveEnd ? new Date(effectiveEnd) : undefined,
      locationId,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<Shift> {
    return this.shiftsService.getShiftById(id);
  }

  @Post()
  @Roles('Admin', 'Manager')
  async create(
    @Body() createShiftDto: CreateShiftRequest,
    @Req() req,
  ): Promise<Shift> {
    return this.shiftsService.createShift({
      ...createShiftDto,
      startTime: new Date(createShiftDto.startTime),
      endTime: new Date(createShiftDto.endTime),
      status: createShiftDto.status as any,
      createdBy: req.user.userId,
    });
  }

  @Post(':id/assign')
  @Roles('Admin', 'Manager')
  async assign(
    @Param('id') id: string,
    @Body() assignStaffDto: AssignStaffRequest,
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

  @Patch(':id')
  @Roles('Admin', 'Manager')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateShiftRequest,
    @Req() req,
  ): Promise<Shift> {
    return this.shiftsService.updateShift(id, req.user.userId, req.user.role, {
      ...updateDto,
      startTime: updateDto.startTime
        ? new Date(updateDto.startTime)
        : undefined,
      endTime: updateDto.endTime ? new Date(updateDto.endTime) : undefined,
    } as any);
  }
}
