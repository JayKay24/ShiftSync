import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DatabaseModule } from '../database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
