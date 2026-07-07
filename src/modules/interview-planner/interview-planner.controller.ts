import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { InterviewPlannerService } from './interview-planner.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { FindCommonAvailabilityDto } from './dto/find-common-availability.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutoScheduleInterviewDto } from './dto/auto-schedule-interview.dto';
@ApiTags('Interview Planner')
@ApiBearerAuth()
@Controller('interview-planner')
/**
 * Interview Planner API.
 */
export class InterviewPlannerController {
  constructor(private readonly interviewPlannerService: InterviewPlannerService) {}
  @ApiOperation({
    summary: 'Create user availability slot',
  })
  @UseGuards(JwtAuthGuard)
  @Post('availability')
  createAvailability(
    @Request() req: Express.Request & { user: { userId: string } },
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.interviewPlannerService.createAvailability(req.user.userId, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Post('schedule')
  scheduleInterview(
    @Request() req: Express.Request & { user: { userId: string } },
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.interviewPlannerService.scheduleInterview(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('common-slots')
  findCommonSlots(@Body() dto: FindCommonAvailabilityDto): unknown {
    return this.interviewPlannerService.findCommonAvailability(dto.employerId, dto.candidateId);
  }
  /**
   * Automatically schedules
   * interview using the earliest
   * common availability slot.
   */
  @UseGuards(JwtAuthGuard)
  @Post('auto-schedule')
  autoScheduleInterview(
    @Request()
    req: Express.Request & {
      user: { userId: string };
    },
    @Body()
    dto: AutoScheduleInterviewDto,
  ) {
    return this.interviewPlannerService.autoScheduleInterview(req.user.userId, dto.applicationId);
  }
}
