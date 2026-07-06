import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateJobDto } from './dto/create-job.dto';
import { JobPayload } from './interfaces/job-payload.interface';

@Injectable()
export class PerformanceWorkerService {
  private readonly logger = new Logger(PerformanceWorkerService.name);

  constructor(
    @InjectQueue('performance-heavy-tasks') 
    private readonly taskQueue: Queue<JobPayload>
  ) {}

  
  async enqueueTask(createJobDto: CreateJobDto): Promise<{ jobId: string; status: string }> {
    const customJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload: JobPayload = {
      jobId: customJobId,
      taskType: createJobDto.taskType,
      targetEmail: createJobDto.targetEmail,
      lang: createJobDto.lang,
      financialData: createJobDto.financialData,
    };


    const job = await this.taskQueue.add(createJobDto.taskType, payload, {
      jobId: customJobId,
    });

    this.logger.log(`[Queue Action] Successfully dispatched task type ${createJobDto.taskType} to Redis. Assigned ID: ${job.id}`);

    return {
      jobId: job.id || customJobId,
      status: 'queued',
    };
  }

  
  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.taskQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`The requested execution job resource with ID "${jobId}" was not found in active cluster memory.`);
    }

    const state = await job.getState();
    const progress = job.progress;
    const reason = job.failedReason;

    return {
      id: job.id,
      name: job.name,
      currentState: state,
      completionProgress: `${progress}%`,
      failureDiagnostics: reason || null,
      metadata: {
        createdAt: new Date(job.timestamp).toISOString(),
        processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      },
    };
  }
}