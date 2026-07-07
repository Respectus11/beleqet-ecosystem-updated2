// =============================================================================
// src/modules/notifications/notifications.service.ts
// =============================================================================

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { I18nService } from 'nestjs-i18n';

import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES, NOTIFICATION_JOBS } from '../queues/queues.constants';
import { NOTIFICATION_TYPES } from '@common/constants/notification-types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,

    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Sends interview scheduled notifications.
   *
   * Creates in-app notifications immediately and
   * queues email and Telegram notifications.
   *
   * @param interviewId Interview identifier
   * @param employerId Employer user id
   * @param candidateId Candidate user id
   * @param jobTitle Job title
   */
  async sendInterviewScheduled(
    interviewId: string,
    employerId: string,
    candidateId: string,
    jobTitle: string,
  ): Promise<void> {
    const [candidate, employer] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: candidateId },
        select: {
          email: true,
          telegramId: true,
        },
      }),

      this.prisma.user.findUnique({
        where: { id: employerId },
        select: {
          email: true,
          telegramId: true,
        },
      }),
    ]);

    const title = await this.i18n.translate('interview.notification.scheduledTitle');

    const candidateBody = await this.i18n.translate('interview.notification.scheduledBody', {
      args: {
        jobTitle,
      },
    });
    const notificationType = NOTIFICATION_TYPES.INTERVIEW_SCHEDULED;
    const employerBody = await this.i18n.translate('interview.notification.employerScheduledBody');
    await Promise.all([
      this.notificationQueue.add(NOTIFICATION_JOBS.SEND_IN_APP, {
        userId: candidateId,
        type: notificationType,
        title: title,
        body: candidateBody,
        metadata: { interviewId },
      }),

      this.notificationQueue.add(NOTIFICATION_JOBS.SEND_IN_APP, {
        userId: employerId,
        type: notificationType,
        title: title,
        body: employerBody,
        metadata: { interviewId },
      }),

      candidate?.email
        ? this.notificationQueue.add(NOTIFICATION_JOBS.SEND_EMAIL, {
            to: candidate.email,
            subject: title,
            html: `<p>${candidateBody}</p>`,
          })
        : Promise.resolve(),

      employer?.email
        ? this.notificationQueue.add(NOTIFICATION_JOBS.SEND_EMAIL, {
            to: employer.email,
            subject: title,
            html: `<p>${employerBody}</p>`,
          })
        : Promise.resolve(),

      candidate?.telegramId
        ? this.notificationQueue.add(NOTIFICATION_JOBS.SEND_TELEGRAM, {
            telegramId: candidate.telegramId,
            message: candidateBody,
          })
        : Promise.resolve(),

      employer?.telegramId
        ? this.notificationQueue.add(NOTIFICATION_JOBS.SEND_TELEGRAM, {
            telegramId: employer.telegramId,
            message: employerBody,
          })
        : Promise.resolve(),
    ]);
  }
}
