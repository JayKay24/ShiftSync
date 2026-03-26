import { Controller, Post, Body, Param, UseGuards, Req, Get } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto, AssignStaffDto } from './dto/shift.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Shift, AssignmentResult } from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<Shift> {
    return this.shiftsService.getShiftById(id);
  }

  @Post()
  @Roles('Admin', 'Manager')
  async create(@Body() createShiftDto: CreateShiftDto, @Req() req): Promise<Shift> {
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
    @Body() assignStaffDto: AssignStaffDto & { overrideReason?: string },
    @Req() req
  ): Promise<AssignmentResult> {
    return this.shiftsService.assignStaff(
      id,
      assignStaffDto.userId,
      req.user.userId,
      assignStaffDto.overrideReason
    );
  }
}
