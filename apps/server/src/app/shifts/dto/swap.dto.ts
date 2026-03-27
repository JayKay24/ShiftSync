import { IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateSwapRequestDto {
  @IsUUID()
  shiftId: string;

  @IsUUID()
  @IsOptional()
  targetUserId?: string; // Optional for "drop" requests
}

export class RespondToSwapDto {
  @IsUUID()
  requestId: string;

  @IsOptional()
  @MaxLength(200)
  reason?: string;
}
