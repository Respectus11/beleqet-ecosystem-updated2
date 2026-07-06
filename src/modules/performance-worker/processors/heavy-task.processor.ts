import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobPayload } from '../interfaces/job-payload.interface';

@Processor('performance-heavy-tasks')
export class HeavyTaskProcessor extends WorkerHost {
  private readonly logger = new Logger(HeavyTaskProcessor.name);

  private readonly i18nDictionary: Record<string, Record<string, string>> = {
    en: {
      START: 'Processing asynchronous background job execution path.',
      SUCCESS: 'Background asynchronous task resolved successfully.',
      FAIL: 'Job iteration triggered an execution lifecycle failure.',
    },
    am: {
      START: 'የጀርባ ስራ ሂደት ማስፈጸም በሂደት ላይ ነው።',
      SUCCESS: 'የጀርባው ተግባር በተሳካ ሁኔታ ተጠናቋል።',
      FAIL: 'የስራ ማስፈጸም ሂደት ላይ ስህተት አጋጥሟል።',
    },
  };


  async process(job: Job<JobPayload, any, string>): Promise<any> {
    const { taskType, targetEmail, lang, financialData } = job.data;
    

    const maskedEmail = this.maskGDPRData(targetEmail);
    const logLanguage = this.i18nDictionary[lang] ? lang : 'en';

    this.logger.log(`[Job ID: ${job.id}] [Type: ${taskType}] - ${this.i18nDictionary[logLanguage]['START']}`);
    this.logger.log(`[GDPR Compliance Protected] Secure Target Entity: ${maskedEmail}`);

   
    await job.updateProgress(25);

    switch (taskType) {
      case 'FILE_PROCESSING':
        await this.simulateHeavyOperation(1500); 
        await job.updateProgress(75);
        break;

      case 'EMAIL_BATCH':
        await this.simulateHeavyOperation(1200);
        await job.updateProgress(80);
        break;

      case 'FINANCIAL_REPORT':
        if (financialData) {
        
          const normalizedReportOutput = this.processMultiCurrencyData(
            financialData.amount,
            financialData.currency,
            financialData.exchangeRate
          );
          this.logger.log(`[Multi-Currency Verified] Payload Output: ${normalizedReportOutput}`);
        }
        await this.simulateHeavyOperation(2000); // Simulate complex reporting data crunching
        await job.updateProgress(90);
        break;

      default:
        throw new Error(`Unsupported pipeline execution task type configuration: ${taskType}`);
    }

    await job.updateProgress(100);
    
    this.logger.log(`[Job ID: ${job.id}] - ${this.i18nDictionary[logLanguage]['SUCCESS']}`);
    
    return {
      success: true,
      processedAt: new Date().toISOString(),
      securedRecipient: maskedEmail,
    };
  }

  
  private maskGDPRData(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***';
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  }

 
  private processMultiCurrencyData(amount: number, currency: string, rate: number): string {
    const baseValueCalculated = amount * rate;
    return `Base-Normalized System Calculation: ${baseValueCalculated.toFixed(2)} [Currency Token: ${currency.toUpperCase()} Anchor Base]`;
  }


  private async simulateHeavyOperation(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}