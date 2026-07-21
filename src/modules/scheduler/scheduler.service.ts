/**
 * @file scheduler.service.ts
 * @description
 * Cron triggers for the Subscription Manager. Kept as a thin layer over
 * SubscriptionsService/NotificationsService so the actual sweep/reminder
 * logic is unit-testable without needing to fire the @Cron decorators.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Daily sweep: expires any ACTIVE subscription whose period has ended. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'subscriptions-expiry-sweep' })
  async handleExpirySweep(): Promise<void> {
    const expired = await this.subscriptionsService.sweepExpired();
    for (const subscription of expired) {
      await this.notificationsService.sendSubscriptionExpired(
        subscription.userId,
        subscription.planName,
      );
    }
    if (expired.length > 0) {
      this.logger.log(`Expiry sweep: marked ${expired.length} subscription(s) EXPIRED`);
    }
  }

  /** Daily reminder: notifies users whose subscription expires within 3 days. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'subscriptions-expiry-reminder' })
  async handleExpiryReminders(): Promise<void> {
    const due = await this.subscriptionsService.findAndMarkDueForReminder(3);
    for (const subscription of due) {
      await this.notificationsService.sendSubscriptionExpiringSoon(
        subscription.userId,
        subscription.planName,
        subscription.currentPeriodEnd,
      );
    }
    if (due.length > 0) {
      this.logger.log(`Expiry reminders: notified ${due.length} user(s)`);
    }
  }
}
