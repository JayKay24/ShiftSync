import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HourDistributionRecord, FairnessScoreResponse } from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('distribution')
  @Roles('Admin', 'Manager')
  async getHoursDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<HourDistributionRecord[]> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    return this.analyticsService.getHoursDistribution(start, end);
  }

  @Get('fairness')
  @Roles('Admin', 'Manager')
  async getFairnessScore(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FairnessScoreResponse> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    return this.analyticsService.getFairnessScore(start, end);
  }
}
