import {
  Controller,
  Get,
  SerializeOptions,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponse, HealthResponseSchema } from '@shiftsync/data-access';
import { AppService } from './app.service';

/**
 * Controller handling root-level probes and system health checks.
 */
@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Unversioned health check endpoint verifying service availability.
   *
   * @returns {HealthResponse} Health status object.
   */
  @Version(VERSION_NEUTRAL)
  @Get()
  @ApiOperation({ summary: 'Health check probe' })
  @ApiOkResponse({
    standardSchema: HealthResponseSchema,
    description: 'System health confirmation',
  })
  @SerializeOptions({ schema: HealthResponseSchema })
  getData(): HealthResponse {
    return this.appService.getData();
  }
}
