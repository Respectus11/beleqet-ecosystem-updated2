import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PerformanceWorkerController } from './performance-worker.controller';
import { PerformanceWorkerService } from './performance-worker.service';
import { HeavyTaskProcessor } from './processors/heavy-task.processor';

@Module({
  imports: [
 
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),


    BullModule.registerQueue({
      name: 'performance-heavy-tasks',
      defaultJobOptions: {

        attempts: 3, 
        backoff: {
          type: 'exponential',
          delay: 2000, 
        },
        removeOnComplete: { age: 3600 }, 
        removeOnFail: { age: 86400 }, 
      },
    }),
  ],
  controllers: [PerformanceWorkerController],
  providers: [PerformanceWorkerService, HeavyTaskProcessor],
  exports: [PerformanceWorkerService],
})
export class PerformanceWorkerModule {}