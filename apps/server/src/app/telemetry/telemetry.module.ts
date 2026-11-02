/**
 * @fileoverview Global telemetry module providing OpenTelemetry services across apps/server.
 */

import { Global, Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TraceResponseInterceptor } from './trace-response.interceptor';

@Global()
@Module({
  providers: [TelemetryService, TraceResponseInterceptor],
  exports: [TelemetryService, TraceResponseInterceptor],
})
export class TelemetryModule {}
