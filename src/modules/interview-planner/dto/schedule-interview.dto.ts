import { IsDateString, IsOptional, IsString, IsUUID, Max, Min, IsInt } from 'class-validator';

/**
 * Schedule interview request.
 */
export class ScheduleInterviewDto {
  @IsUUID()
  applicationId!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
