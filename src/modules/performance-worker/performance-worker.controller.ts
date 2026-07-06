import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { PerformanceWorkerService } from './performance-worker.service';
import { CreateJobDto } from './dto/create-job.dto';

@Controller('performance-worker')
export class PerformanceWorkerController {
  constructor(private readonly performanceService: PerformanceWorkerService) {}

  
  @Post('dispatch')
  @HttpCode(HttpStatus.ACCEPTED) 
  async dispatchBackgroundTask(@Body() createJobDto: CreateJobDto) {
    return await this.performanceService.enqueueTask(createJobDto);
  }

  
  @Get('job/:id/status')
  async getTaskLifecycleMetrics(@Param('id') id: string) {
    return await this.performanceService.getJobStatus(id);
  }
}