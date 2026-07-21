/**
 * @file billing.service.ts
 * @description
 * Integration seam between payment gateways and the Subscription domain.
 *
 * Two entry points feed into the same SubscriptionsService.syncFromProviderEvent:
 *  1. `handleSubscriptionLifecycleEvent` — an @OnEvent listener for the event
 *     PaypalService emits after processing its own (already signature-verified)
 *     webhook. This is how PayPal recurring-billing events reach the
 *     Subscription domain without PaymentsModule depending on this module.
 *  2. `handleGenericWebhook` — the gateway-agnostic POST /billing/webhook
 *     endpoint, for gateways that don't already have a dedicated controller.
 */
import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  SubscriptionsService,
  SyncFromProviderEventInput,
} from '../subscriptions/subscriptions.service';
import { SUBSCRIPTION_LIFECYCLE_EVENT } from '../payments/paypal.service';
import { WalletService } from '../wallet/wallet.service';
import { GenericBillingWebhookDto } from './dto/generic-billing-webhook.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly walletService: WalletService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = this.config.get<string>('BILLING_WEBHOOK_SECRET', '');
  }

  @OnEvent(SUBSCRIPTION_LIFECYCLE_EVENT)
  async handleSubscriptionLifecycleEvent(payload: SyncFromProviderEventInput): Promise<void> {
    await this.subscriptionsService.syncFromProviderEvent(payload);
  }

  /** Converts a charge amount into the plan's billing currency (reuses WalletModule's rate table). */
  convertToPlanCurrency(amount: number, from: string, to: string): number {
    return this.walletService.convertCurrency(amount, from, to);
  }

  async handleGenericWebhook(
    dto: GenericBillingWebhookDto,
    signature: string | undefined,
  ): Promise<void> {
    this.verifySignature(dto, signature);

    await this.subscriptionsService.syncFromProviderEvent({
      gatewayEventId: dto.gatewayEventId,
      provider: dto.provider,
      eventType: dto.eventType,
      providerSubscriptionId: dto.providerSubscriptionId,
      amount: dto.amount,
      currency: dto.currency,
      gatewayReference: dto.gatewayReference,
      rawPayload: dto.rawPayload ?? {},
    });
  }

  private verifySignature(dto: GenericBillingWebhookDto, signature: string | undefined): void {
    if (!this.webhookSecret) {
      this.logger.warn(
        'BILLING_WEBHOOK_SECRET not set — skipping signature verification (unsafe for production)',
      );
      return;
    }

    const expected = createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(dto))
      .digest('hex');
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(signature ?? '');

    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      throw new UnprocessableEntityException('Invalid billing webhook signature.');
    }
  }
}
