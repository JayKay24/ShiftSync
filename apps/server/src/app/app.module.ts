import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { StandardSchemaSerializerInterceptor } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database.module';
import { AuthModule } from './auth/auth.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { NotificationModule } from './notifications/notification.module';
import { UsersModule } from './users/users.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { TraceResponseInterceptor } from './telemetry/trace-response.interceptor';
import { createLoggerConfig } from './telemetry/logger.config';

/**
 * Root application module aggregating core infrastructure and feature modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(createLoggerConfig()),
    TelemetryModule,
    DatabaseModule,
    AuthModule,
    ShiftsModule,
    AnalyticsModule,
    AuditModule,
    NotificationModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new StandardSchemaSerializerInterceptor(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceResponseInterceptor,
    },
  ],
})
export class AppModule {}
