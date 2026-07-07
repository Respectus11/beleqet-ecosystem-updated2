import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AvailabilityOverlap {
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class CommonAvailabilityHelper {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds all overlapping availability windows
   * between an employer and a candidate.
   *
   * The returned list is ordered chronologically.
   *
   * @param employerId Employer user id
   * @param candidateId Candidate user id
   * @returns List of common availability windows
   */
  async findCommonAvailability(
    employerId: string,
    candidateId: string,
  ): Promise<AvailabilityOverlap[]> {
    const [employerSlots, candidateSlots] = await Promise.all([
      this.prisma.userAvailability.findMany({
        where: {
          userId: employerId,
        },
        orderBy: {
          startTime: 'asc',
        },
      }),

      this.prisma.userAvailability.findMany({
        where: {
          userId: candidateId,
        },
        orderBy: {
          startTime: 'asc',
        },
      }),
    ]);
    //  Two-pointer comparison intersection algorithm to find overlapping slots
    // to avoid O(n^2) complexity of nested loops.
    let employerIndex = 0;
    let candidateIndex = 0;

    const overlaps: AvailabilityOverlap[] = [];

    while (employerIndex < employerSlots.length && candidateIndex < candidateSlots.length) {
      const employerSlot = employerSlots[employerIndex];
      const candidateSlot = candidateSlots[candidateIndex];

      const overlapStart =
        employerSlot.startTime > candidateSlot.startTime
          ? employerSlot.startTime
          : candidateSlot.startTime;

      const overlapEnd =
        employerSlot.endTime < candidateSlot.endTime ? employerSlot.endTime : candidateSlot.endTime;

      if (overlapStart < overlapEnd) {
        overlaps.push({
          startTime: overlapStart,
          endTime: overlapEnd,
        });
      }

      if (employerSlot.endTime < candidateSlot.endTime) {
        employerIndex++;
      } else {
        candidateIndex++;
      }
    }

    return overlaps;
  }
}
