import { Module, Global } from '@nestjs/common';
import { DatabaseModule, DRIZZLE } from './database.module';
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
} from '@shiftsync/data-access';

export const REPOSITORIES = [
  {
    provide: ShiftRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new ShiftRepository(db),
    inject: [DRIZZLE],
  },
  {
    provide: UserRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new UserRepository(db),
    inject: [DRIZZLE],
  },
  {
    provide: LocationRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new LocationRepository(db),
    inject: [DRIZZLE],
  },
  {
    provide: SkillRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new SkillRepository(db),
    inject: [DRIZZLE],
  },
  {
    provide: TimeEntryRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new TimeEntryRepository(db),
    inject: [DRIZZLE],
  },
  {
    provide: AssignmentRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new AssignmentRepository(db),
    inject: [DRIZZLE],
  },
  {
    provide: DashboardRepository,
    useFactory: (db: NodePgDatabase<typeof schema>) => new DashboardRepository(db),
    inject: [DRIZZLE],
  },
];

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [...REPOSITORIES],
  exports: [...REPOSITORIES],
})
export class RepositoriesModule {}
