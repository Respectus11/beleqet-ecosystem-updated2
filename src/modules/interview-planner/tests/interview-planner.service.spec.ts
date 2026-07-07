import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';

import { InterviewPlannerService } from '../interview-planner.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';

import { NotificationsService } from '../../notifications/notifications.service';
import { AvailabilityHelper } from '../helpers/availability.helper';
import { CommonAvailabilityHelper } from '../helpers/common-availability.helper';
import { ApplicationHelper } from '../helpers/application.helper';
import { DateHelper } from '../helpers/date.helper';
describe('InterviewPlannerService', () => {
  let service: InterviewPlannerService;

  const prismaMock = {
    userAvailability: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },

    $transaction: jest.fn(),
  };

  const i18nMock = {
    translate: jest.fn().mockResolvedValue('translated-message'),
  };

  const notificationsMock = {
    sendInterviewScheduled: jest.fn(),
  };

  const availabilityHelperMock = {
    validateAvailability: jest.fn(),
    validateInterviewConflicts: jest.fn(),
  };

  const commonAvailabilityHelperMock = {
    findCommonAvailability: jest.fn(),
  };

  const applicationHelperMock = {
    validateInterviewApplication: jest.fn(),
  };
  const dateHelperMock = {
    convertToUTC: jest.fn(),
    convertFromUTC: jest.fn(),

    validateRange: jest.fn().mockResolvedValue(undefined),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewPlannerService,

        {
          provide: PrismaService,
          useValue: prismaMock,
        },

        {
          provide: I18nService,
          useValue: i18nMock,
        },

        {
          provide: NotificationsService,
          useValue: notificationsMock,
        },

        {
          provide: AvailabilityHelper,
          useValue: availabilityHelperMock,
        },

        {
          provide: CommonAvailabilityHelper,
          useValue: commonAvailabilityHelperMock,
        },

        {
          provide: ApplicationHelper,
          useValue: applicationHelperMock,
        },
        {
          provide: DateHelper,
          useValue: dateHelperMock,
        },
      ],
    }).compile();

    service = module.get(InterviewPlannerService);

    jest.clearAllMocks();
  });

  describe('createAvailability', () => {
    it('should create availability slot', async () => {
      prismaMock.userAvailability.findFirst.mockResolvedValue(null);

      prismaMock.userAvailability.create.mockResolvedValue({
        id: 'availability-id',
      });

      const result = await service.createAvailability('user-1', {
        startTime: '2025-08-01T09:00:00.000Z',
        endTime: '2025-08-01T10:00:00.000Z',
      });

      expect(result.id).toBe('availability-id');

      expect(prismaMock.userAvailability.create).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid range', async () => {
      await expect(
        service.createAvailability('user-1', {
          startTime: '2025-08-01T10:00:00.000Z',
          endTime: '2025-08-01T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject overlapping availability', async () => {
      prismaMock.userAvailability.findFirst.mockResolvedValue({
        id: 'existing-slot',
      });

      await expect(
        service.createAvailability('user-1', {
          startTime: '2025-08-01T09:00:00.000Z',
          endTime: '2025-08-01T10:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('scheduleInterview', () => {
    it('should schedule interview successfully', async () => {
      const application = {
        id: 'app-1',
        userId: 'candidate-1',
        job: {
          title: 'Backend Engineer',
          interviewDurationMinutes: 60,
        },
      };

      applicationHelperMock.validateInterviewApplication.mockResolvedValue(application);

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          interview: {
            create: jest.fn().mockResolvedValue({
              id: 'interview-1',
            }),
          },

          application: {
            update: jest.fn(),
          },
        }),
      );

      const result = await service.scheduleInterview('employer-1', {
        applicationId: 'app-1',
        startTime: '2025-08-01T09:00:00.000Z',
        endTime: '2025-08-01T10:00:00.000Z',
      });

      expect(result.id).toBe('interview-1');

      expect(notificationsMock.sendInterviewScheduled).toHaveBeenCalledTimes(1);
    });

    it('should reject wrong duration', async () => {
      applicationHelperMock.validateInterviewApplication.mockResolvedValue({
        id: 'app-1',
        userId: 'candidate-1',
        job: {
          interviewDurationMinutes: 90,
        },
      });

      await expect(
        service.scheduleInterview('employer-1', {
          applicationId: 'app-1',
          startTime: '2025-08-01T09:00:00.000Z',
          endTime: '2025-08-01T10:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('autoScheduleInterview', () => {
    it('should auto schedule using earliest common slot', async () => {
      applicationHelperMock.validateInterviewApplication.mockResolvedValue({
        id: 'app-1',
        userId: 'candidate-1',
        job: {
          title: 'Backend Engineer',
          interviewDurationMinutes: 60,
        },
      });

      commonAvailabilityHelperMock.findCommonAvailability.mockResolvedValue([
        {
          startTime: new Date('2025-08-01T09:00:00.000Z'),
          endTime: new Date('2025-08-01T11:00:00.000Z'),
        },
      ]);

      jest.spyOn(service, 'scheduleInterview').mockResolvedValue({ id: 'interview-1' } as never);

      const result = await service.autoScheduleInterview('employer-1', 'app-1');

      expect(result).toEqual({
        id: 'interview-1',
      });

      expect(service.scheduleInterview).toHaveBeenCalled();
    });

    it('should fail when no common slot exists', async () => {
      applicationHelperMock.validateInterviewApplication.mockResolvedValue({
        id: 'app-1',
        userId: 'candidate-1',
        job: {
          interviewDurationMinutes: 60,
        },
      });

      commonAvailabilityHelperMock.findCommonAvailability.mockResolvedValue([]);

      await expect(service.autoScheduleInterview('employer-1', 'app-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
