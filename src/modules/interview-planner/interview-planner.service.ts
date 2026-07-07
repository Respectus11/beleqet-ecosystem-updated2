import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { I18nService } from 'nestjs-i18n';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { AvailabilityHelper } from './helpers/availability.helper';
import { CommonAvailabilityHelper } from './helpers/common-availability.helper';
import { ApplicationHelper } from './helpers/application.helper';
import { DateHelper } from './helpers/date.helper';
import { ApplicationStatus, Prisma } from '@prisma/client';
@Injectable()
export class InterviewPlannerService {
  private readonly logger = new Logger(InterviewPlannerService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly notificationsService: NotificationsService,
    private readonly availabilityHelper: AvailabilityHelper,
    private readonly commonAvailabilityHelper: CommonAvailabilityHelper,
    private readonly applicationHelper: ApplicationHelper,
    private readonly dateHelper: DateHelper,
  ) {}

  /**
   * Creates an availability slot for a user.
   *
   * Prevents invalid ranges where endTime <= startTime.
   *
   * @param userId User creating availability
   * @param dto Availability data
   * @returns Created availability record
   */

  async createAvailability(userId: string, dto: CreateAvailabilityDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }
    const overlappingSlot = await this.prisma.userAvailability.findFirst({
      where: {
        userId,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });

    if (overlappingSlot) {
      throw new ConflictException(await this.i18n.translate('interview.availability.overlap'));
    }
    return this.prisma.userAvailability.create({
      data: {
        userId,
        startTime,
        endTime,
        timezone: dto.timezone ?? 'UTC',
      },
    });
  }
  /**
   * Retrieves all availability slots for a user.
   *
   * Slots are ordered chronologically by their start time.
   *
   * @param userId User identifier
   * @returns List of availability records
   */
  async getUserAvailabilities(userId: string) {
    return this.prisma.userAvailability.findMany({
      where: {
        userId,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }
  /**
   * Schedules an interview between an employer and a candidate.
   *
   * Validations:
   * - Application exists
   * - Employer owns the job
   * - Application has no interview yet
   * - Candidate is available
   * - Employer is available
   * - No overlapping interviews
   *
   * @param employerId Employer user id
   * @param dto Interview scheduling payload
   * @returns Newly created interview
   */
  async scheduleInterview(employerId: string, dto: ScheduleInterviewDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const requestedDurationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / 60000);
    await this.dateHelper.validateRange(startTime, endTime);

    const application = await this.applicationHelper.validateInterviewApplication(
      employerId,
      dto.applicationId,
    );

    const candidateId = application.userId;
    const interviewDurationMinutes = application.job.interviewDurationMinutes ?? 60;
    if (requestedDurationMinutes !== interviewDurationMinutes) {
      throw new BadRequestException(
        await this.i18n.translate('interview.interview.invalidDuration'),
      );
    }
    const interview = await this.prisma.$transaction(
      async (tx) => {
        await this.availabilityHelper.validateAvailability(
          tx,
          employerId,
          candidateId,
          startTime,
          endTime,
        );

        await this.availabilityHelper.validateInterviewConflicts(
          tx,
          employerId,
          candidateId,
          startTime,
          endTime,
        );
        const createdInterview = await tx.interview.create({
          data: {
            applicationId: application.id,
            employerId,
            candidateId,
            startTime,
            endTime,
            timezone: dto.timezone ?? 'UTC',
            notes: dto.notes,
            durationMinutes: interviewDurationMinutes,
          },
        });

        await tx.application.update({
          where: {
            id: application.id,
          },
          data: {
            status: ApplicationStatus.INTERVIEW_SCHEDULED,
            interviewSlot: startTime,
          },
        });

        return createdInterview;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
    await this.notificationsService.sendInterviewScheduled(
      interview.id,
      employerId,
      candidateId,
      application.job.title,
    );
    this.logger.log(`Interview ${interview.id} scheduled by employer ${employerId}`);
    return interview;
  }
  /**
   * Finds time slots where both employer and candidate are available.
   */
  async findCommonAvailability(employerId: string, candidateId: string) {
    return this.commonAvailabilityHelper.findCommonAvailability(employerId, candidateId);
  }
  /**
   * Automatically schedules an interview
   * using the earliest common availability
   * between employer and candidate.
   *
   * Flow:
   * - Validate application
   * - Find common availability
   * - Select earliest slot
   * - Schedule interview
   * - Send notifications
   *
   * @param employerId Employer user id
   * @param applicationId Application id
   * @returns Created interview
   */
  async autoScheduleInterview(employerId: string, applicationId: string) {
    const application = await this.applicationHelper.validateInterviewApplication(
      employerId,
      applicationId,
    );

    const candidateId = application.userId;
    const interviewDurationMinutes = application.job.interviewDurationMinutes ?? 60;

    const commonSlots = await this.findCommonAvailability(employerId, candidateId);

    if (!commonSlots.length) {
      throw new ConflictException(
        await this.i18n.translate('interview.interview.noCommonAvailability'),
      );
    }

    /**
     * Earliest available slot
     */
    const selectedSlot = commonSlots.reduce((earliest, current) =>
      current.startTime < earliest.startTime ? current : earliest,
    );

    const startTime = selectedSlot.startTime;

    const endTime = new Date(startTime.getTime() + interviewDurationMinutes * 60 * 1000);

    return this.scheduleInterview(employerId, {
      applicationId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone: 'UTC',
    });
  }
}
