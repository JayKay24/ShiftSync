import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@shiftsync/data-access';

import {
  ShiftRepository,
  UserRepository,
  LocationRepository,
  SkillRepository,
  TimeEntryRepository,
  AssignmentRepository,
  DashboardRepository,
  NotificationRepository,
  AnalyticsRepository,
  AuditRepository,
  SwapRepository,
} from '@shiftsync/data-access';

export const REPOSITORIES = [
  {
    provide: ShiftRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new ShiftRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: UserRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new UserRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: LocationRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) =>
      new LocationRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: SkillRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new SkillRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: TimeEntryRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) =>
      new TimeEntryRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: AssignmentRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) =>
      new AssignmentRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: DashboardRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) =>
      new DashboardRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: NotificationRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) =>
      new NotificationRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: AnalyticsRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) =>
      new AnalyticsRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: AuditRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new AuditRepository(db),
    inject: [getDrizzleToken()],
  },
  {
    provide: SwapRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new SwapRepository(db),
    inject: [getDrizzleToken()],
  },
];

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [...REPOSITORIES],
  exports: [...REPOSITORIES],
})
export class RepositoriesModule {}
