import { IsUUID } from 'class-validator';

/**
 * Automatically schedule interview
 * using the first available common slot.
 */
export class AutoScheduleInterviewDto {
  @IsUUID()
  applicationId!: string;
}
