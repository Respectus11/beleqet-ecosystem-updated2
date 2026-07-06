import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export enum TaskType {
  FILE_PROCESSING = 'FILE_PROCESSING',
  EMAIL_BATCH = 'EMAIL_BATCH',
  FINANCIAL_REPORT = 'FINANCIAL_REPORT',
}

export class CreateJobDto {
  @IsEnum(TaskType, { message: 'Invalid task type configuration.' })
  @IsNotEmpty()
  taskType!: TaskType;

  @IsEmail({}, { message: 'A valid client target email is required for GDPR tracking.' })
  @IsNotEmpty()
  targetEmail!: string; 

  @IsString()
  @IsNotEmpty()
  lang!: string; 

  @IsOptional()
  @IsObject()
  financialData?: {
    amount: number;
    currency: string;
    exchangeRate: number;
  };
}