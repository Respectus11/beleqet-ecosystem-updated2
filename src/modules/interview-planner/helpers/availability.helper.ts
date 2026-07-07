import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
@Injectable()
export class AvailabilityHelper {
  constructor(private readonly i18n: I18nService) {}

  /**
   * Ensures both employer and candidate
   * are available during the requested time.
   */
  async validateAvailability(
    client: PrismaService | Prisma.TransactionClient,
    employerId: string,
    candidateId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const [employerAvailability, candidateAvailability] = await Promise.all([
      client.userAvailability.findFirst({
        where: {
          userId: employerId,
          startTime: { lte: startTime },
          endTime: { gte: endTime },
        },
      }),
      client.userAvailability.findFirst({
        where: {
          userId: candidateId,
          startTime: { lte: startTime },
          endTime: { gte: endTime },
        },
      }),
    ]);

    if (!employerAvailability) {
      throw new ConflictException(
        await this.i18n.translate('interview.availability.employerUnavailable'),
      );
    }

    if (!candidateAvailability) {
      throw new ConflictException(
        await this.i18n.translate('interview.availability.candidateUnavailable'),
      );
    }
  }

  /**
   * Ensures neither participant already
   * has another interview.
   */
  async validateInterviewConflicts(
    client: PrismaService | Prisma.TransactionClient,
    employerId: string,
    candidateId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const [candidateConflict, employerConflict] = await Promise.all([
      client.interview.findFirst({
        where: {
          candidateId,
          status: 'SCHEDULED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
      client.interview.findFirst({
        where: {
          employerId,
          status: 'SCHEDULED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
    ]);

    if (candidateConflict) {
      throw new ConflictException(await this.i18n.translate('interview.interview.candidateBusy'));
    }

    if (employerConflict) {
      throw new ConflictException(await this.i18n.translate('interview.interview.employerBusy'));
    }
  }
}
