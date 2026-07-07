import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ApplicationHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Validates that an application can be scheduled
   * for an interview by the given employer.
   *
   * Validation rules:
   * - Application exists
   * - Employer owns the job
   * - Interview has not already been scheduled
   *
   * @param employerId Employer user id
   * @param applicationId Application id
   * @returns Application with related entities
   */
  async validateInterviewApplication(employerId: string, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        user: true,
        interview: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        await this.i18n.translate('interview.interview.applicationNotFound'),
      );
    }

    if (application.job.company.userId !== employerId) {
      throw new ForbiddenException(await this.i18n.translate('interview.interview.forbidden'));
    }

    if (application.interview) {
      throw new ConflictException(
        await this.i18n.translate('interview.interview.alreadyScheduled'),
      );
    }

    return application;
  }
}
