import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, NOTIFICATION_JOBS } from '../queues/queues.constants';
import { ConfigService } from '@nestjs/config';

/**
 * Defines the structure for anomaly alert payloads.
 * Used across all alerting channels (Email, Slack, etc.)
 */
export interface AlertPayload {
  /** Short descriptive title of the anomaly */
  title: string;
  /** Detailed message explaining the anomaly */
  message: string;
  /** Severity level of the anomaly */
  severity: 'HIGH' | 'CRITICAL' | 'WARNING';
  /** ISO 8601 timestamp when the anomaly was detected */
  timestamp: string;
}

/**
 * AlertingService - Dispatches anomaly alerts to configured channels.
 * Currently supports Email and Slack notifications.
 * Designed to be extensible for future channels (e.g., PagerDuty, Telegram).
 */
@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  /**
   * Dispatch an anomaly alert through multiple channels (Email, Slack).
   * Uses Promise.all to send alerts in parallel for faster notification.
   * @param payload - Details of the anomaly to alert about
   */
  async dispatchAlert(payload: AlertPayload): Promise<void> {
    try {
      await Promise.all([
        this.sendEmailAlert(payload),
      ]);
    } catch (error) {
      this.logger.error(`Failed to dispatch alert: ${(error as Error).message}`);
    }
  }

  /**
   * Sends an email alert to the security team via the notifications queue.
   * Uses the existing NotificationsQueue infrastructure for reliable delivery.
   * @param payload - Alert details including severity and description
   */
  private async sendEmailAlert(payload: AlertPayload): Promise<void> {
    const adminEmail = this.config.get<string>('SECURITY_ADMIN_EMAIL') || 'security@beleqet.com';

    await this.notificationsQueue.add(NOTIFICATION_JOBS.SEND_EMAIL, {
      to: adminEmail,
      subject: `[${payload.severity}] Beleqet Anomaly Detected: ${payload.title}`,
      html: `<p><strong>Anomaly Detected</strong></p>
             <p><strong>Title:</strong> ${payload.title}</p>
             <p><strong>Severity:</strong> ${payload.severity}</p>
             <p><strong>Time:</strong> ${payload.timestamp}</p>
             <p><strong>Details:</strong> ${payload.message}</p>`,
    });
    this.logger.debug(`Email alert queued for ${adminEmail}`);
  }
}
