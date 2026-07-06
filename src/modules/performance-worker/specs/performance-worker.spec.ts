import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceWorkerService } from '../performance-worker.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { TaskType, CreateJobDto } from '../dto/create-job.dto';

describe('PerformanceWorkerService', () => {
  let service: PerformanceWorkerService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'mock_job_12345' }),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceWorkerService,
        {
          provide: getQueueToken('performance-heavy-tasks'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<PerformanceWorkerService>(PerformanceWorkerService);
  });

  it('should be defined and correctly initialized', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueTask', () => {
    it('should successfully dispatch a valid job payload to the Redis queue cluster', async () => {
      const dto: CreateJobDto = {
        taskType: TaskType.EMAIL_BATCH,
        targetEmail: 'test@beleqet.com',
        lang: 'en',
      };

      const result = await service.enqueueTask(dto);

      expect(mockQueue.add).toHaveBeenCalledWith(TaskType.EMAIL_BATCH, expect.any(Object), expect.any(Object));
      expect(result).toEqual({
        jobId: 'mock_job_12345',
        status: 'queued',
      });
    });
  });

  describe('getJobStatus', () => {
    it('should return complete lifecycle status metrics if the job exists in memory', async () => {
      const mockJob = {
        id: 'mock_job_12345',
        name: 'EMAIL_BATCH',
        getState: jest.fn().mockResolvedValue('active'),
        progress: 25,
        failedReason: null,
        timestamp: Date.now(),
        processedOn: Date.now() + 100,
        finishedOn: null,
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus('mock_job_12345');

      expect(mockQueue.getJob).toHaveBeenCalledWith('mock_job_12345');
      expect(result.currentState).toBe('active');
      expect(result.completionProgress).toBe('25%');
    });

    it('should throw a NotFoundException if the requested job ID does not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getJobStatus('non_existent_id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});