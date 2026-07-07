import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Create availability slot for a user.
 */
export class CreateAvailabilityDto {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
