import { IsUUID, IsDateString, IsInt, Min, IsEnum, IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateShiftRequest, AssignStaffRequest } from '@shiftsync/data-access';

export class CreateShiftDto implements CreateShiftRequest {
  @IsUUID()
  locationId: string;

  @IsUUID()
  requiredSkillId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsInt()
  @Min(1)
  headcountNeeded: number;

  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  @IsOptional()
  status?: 'draft' | 'published' | 'cancelled' | 'completed';

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;
}

export class AssignStaffDto implements AssignStaffRequest {
  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  overrideReason?: string;
}
