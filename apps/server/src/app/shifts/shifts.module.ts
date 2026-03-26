import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';

@Module({
  providers: [ShiftsService, SwapService],
  controllers: [ShiftsController, SwapController],
  exports: [ShiftsService, SwapService],
})
export class ShiftsModule {}
