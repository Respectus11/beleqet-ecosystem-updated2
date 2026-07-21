import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let subscriptionsService: { sweepExpired: jest.Mock; findAndMarkDueForReminder: jest.Mock };
  let notificationsService: {
    sendSubscriptionExpired: jest.Mock;
    sendSubscriptionExpiringSoon: jest.Mock;
  };

  beforeEach(async () => {
    subscriptionsService = { sweepExpired: jest.fn(), findAndMarkDueForReminder: jest.fn() };
    notificationsService = {
      sendSubscriptionExpired: jest.fn(),
      sendSubscriptionExpiringSoon: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  describe('handleExpirySweep', () => {
    it('notifies every user whose subscription the sweep just expired', async () => {
      subscriptionsService.sweepExpired.mockResolvedValue([
        { id: 'sub1', userId: 'user1', planName: 'Pro' },
        { id: 'sub2', userId: 'user2', planName: 'Enterprise' },
      ]);

      await service.handleExpirySweep();

      expect(notificationsService.sendSubscriptionExpired).toHaveBeenCalledWith('user1', 'Pro');
      expect(notificationsService.sendSubscriptionExpired).toHaveBeenCalledWith(
        'user2',
        'Enterprise',
      );
      expect(notificationsService.sendSubscriptionExpired).toHaveBeenCalledTimes(2);
    });

    it('sends no notifications when nothing expired', async () => {
      subscriptionsService.sweepExpired.mockResolvedValue([]);
      await service.handleExpirySweep();
      expect(notificationsService.sendSubscriptionExpired).not.toHaveBeenCalled();
    });
  });

  describe('handleExpiryReminders', () => {
    it('sends a reminder for every subscription due within the window', async () => {
      const currentPeriodEnd = new Date('2026-07-24');
      subscriptionsService.findAndMarkDueForReminder.mockResolvedValue([
        { id: 'sub1', userId: 'user1', planName: 'Pro', currentPeriodEnd },
      ]);

      await service.handleExpiryReminders();

      expect(subscriptionsService.findAndMarkDueForReminder).toHaveBeenCalledWith(3);
      expect(notificationsService.sendSubscriptionExpiringSoon).toHaveBeenCalledWith(
        'user1',
        'Pro',
        currentPeriodEnd,
      );
    });
  });
});
