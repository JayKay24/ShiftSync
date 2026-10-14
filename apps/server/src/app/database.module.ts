import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from '@shiftsync/data-access';

export const DRIZZLE = getDrizzleToken();

@Global()
@Module({
  imports: [
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        return {
          drizzle,
          connection: {
            connectionString: databaseUrl,
          },
          schema,
        };
      },
    }),
  ],
  exports: [DrizzleModule],
})
export class DatabaseModule {}
