import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  HourDistributionRecord,
  HourDistributionRecordSchema,
  FairnessScoreResponse,
  FairnessScoreResponseSchema,
  AnalyticsDateRangeQuery,
  AnalyticsDateRangeQuerySchema,
} from '@shiftsync/data-access';

/**
 * Controller computing staff hour distribution and Fairness Index analytics.
 */
@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Evaluates weekly working hours distribution and scheduled vs desired hours.
   *
   * @param {any} req - Authenticated HTTP request containing actor identity.
   * @param {AnalyticsDateRangeQuery} query - Optional date bounds for evaluation window.
   * @returns {Promise<HourDistributionRecord[]>} Workload distribution records.
   */
  @Get('distribution')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Calculate staff hour distribution' })
  @ApiOkResponse({
    standardSchema: z.array(HourDistributionRecordSchema),
    description: 'Hour distribution records list',
  })
  @SerializeOptions({ schema: HourDistributionRecordSchema })
  async getHoursDistribution(
    @Req() req,
    @Query({ schema: AnalyticsDateRangeQuerySchema })
    query: AnalyticsDateRangeQuery,
  ): Promise<HourDistributionRecord[]> {
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate
      ? new Date(query.endDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    return this.analyticsService.getHoursDistribution(
      start,
      end,
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * Computes the Fairness Index (0-100) scoring equitable distribution of premium weekend shifts.
   *
   * @param {any} req - Authenticated HTTP request.
   * @param {AnalyticsDateRangeQuery} query - Optional date bounds for evaluation window.
   * @returns {Promise<FairnessScoreResponse>} Fairness Index score and premium shift distribution.
   */
  @Get('fairness')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Calculate Fairness Index score' })
  @ApiOkResponse({
    standardSchema: FairnessScoreResponseSchema,
    description: 'Fairness Index score payload',
  })
  @SerializeOptions({ schema: FairnessScoreResponseSchema })
  async getFairnessScore(
    @Req() req,
    @Query({ schema: AnalyticsDateRangeQuerySchema })
    query: AnalyticsDateRangeQuery,
  ): Promise<FairnessScoreResponse> {
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate
      ? new Date(query.endDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    return this.analyticsService.getFairnessScore(
      start,
      end,
      req.user.userId,
      req.user.role,
    );
  }
}
