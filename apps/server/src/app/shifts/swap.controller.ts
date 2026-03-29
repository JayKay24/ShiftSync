import { Controller, Post, Body, UseGuards, Req, Param, Put, Get } from '@nestjs/common';
import { SwapService } from './swap.service';
import { CreateSwapRequestDto, RespondToSwapDto } from './dto/swap.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('swaps')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Get()
  async get(@Req() req) {
    return this.swapService.getSwapRequests(req.user.userId, req.user.role);
  }

  @Post('request')
  @Roles('Staff')
  async request(@Body() dto: CreateSwapRequestDto & { reason: string }, @Req() req) {
    return this.swapService.requestSwap(req.user.userId, dto.shiftId, dto.reason, dto.targetUserId);
  }

  @Put('accept/:id')
  @Roles('Staff')
  async accept(@Param('id') id: string, @Req() req) {
    return this.swapService.acceptSwap(req.user.userId, id);
  }

  @Put('reject/:id')
  @Roles('Staff')
  async reject(@Param('id') id: string, @Req() req) {
    return this.swapService.declineSwap(req.user.userId, id);
  }

  @Put('cancel/:id')
  @Roles('Staff')
  async cancel(@Param('id') id: string, @Req() req) {
    return this.swapService.cancelSwap(req.user.userId, id);
  }

  @Put('approve/:id')
  @Roles('Manager', 'Admin')
  async approve(@Param('id') id: string, @Body() body: { approve: boolean }, @Req() req) {
    return this.swapService.approveSwap(req.user.userId, id, body.approve);
  }
}
