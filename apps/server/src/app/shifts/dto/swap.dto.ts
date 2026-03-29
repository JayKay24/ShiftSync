import { IsUUID, IsOptional, MaxLength, IsString, MinLength } from 'class-validator';

export class CreateSwapRequestDto {
  @IsUUID()
  shiftId: string;

  @IsUUID()
  @IsOptional()
  targetUserId?: string; // Optional for "drop" requests

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class RespondToSwapDto {
  @IsUUID()
  requestId: string;

  @IsOptional()
  @MaxLength(200)
  reason?: string;
}
