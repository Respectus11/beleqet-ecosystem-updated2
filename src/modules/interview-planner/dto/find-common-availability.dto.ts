import { IsUUID } from 'class-validator';

/**
 * Find common availability between employer and candidate.
 */
export class FindCommonAvailabilityDto {
  @IsUUID()
  employerId!: string;

  @IsUUID()
  candidateId!: string;
}
