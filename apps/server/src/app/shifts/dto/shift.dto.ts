import { IsUUID, IsDateString, IsInt, Min, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { shiftStatusEnum } from '@shiftsync/data-access';

export class CreateShiftDto {
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
  status?: string;

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;
}

export class AssignStaffDto {
  @IsUUID()
  userId: string;
}
