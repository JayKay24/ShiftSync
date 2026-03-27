import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database.module";
import { AuthModule } from "./auth/auth.module";
import { ShiftsModule } from "./shifts/shifts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationModule } from "./notifications/notification.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ShiftsModule,
    AnalyticsModule,
    AuditModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
