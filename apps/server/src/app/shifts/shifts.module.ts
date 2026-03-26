import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { ComplianceService } from './compliance.service';

@Module({
  providers: [ShiftsService, SwapService, ComplianceService],
  controllers: [ShiftsController, SwapController],
  exports: [ShiftsService, SwapService, ComplianceService],
})
export class ShiftsModule {}
