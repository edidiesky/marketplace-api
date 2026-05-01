import WebhookLog, { IWebhookLog, WebhookLogStatus } from "../models/WebhookLog";
import { PaymentGateway } from "../models/Payment";
import logger from "../utils/logger";

export class WebhookRepository {
  async logFailure(data: {
    gateway: PaymentGateway;
    transactionId: string;
    rawPayload: Record<string, any>;
    failureReason: string;
  }): Promise<IWebhookLog> {
    return WebhookLog.create({
      ...data,
      retryCount: 0,
      lastAttemptAt: new Date(),
      nextRetryAt: this.computeNextRetry(0),
      status: WebhookLogStatus.PENDING,
    });
  }

  async incrementRetry(
    id: string,
    failureReason: string
  ): Promise<IWebhookLog | null> {
    const log = await WebhookLog.findById(id);
    if (!log) return null;

    const newRetryCount = log.retryCount + 1;
    const isPermanentFailure = newRetryCount >= 3;

    return WebhookLog.findByIdAndUpdate(
      id,
      {
        $set: {
          retryCount: newRetryCount,
          lastAttemptAt: new Date(),
          failureReason,
          status: isPermanentFailure
            ? WebhookLogStatus.PERMANENT_FAILURE
            : WebhookLogStatus.PENDING,
          nextRetryAt: isPermanentFailure
            ? undefined
            : this.computeNextRetry(newRetryCount),
        },
      },
      { new: true }
    );
  }

  async markCompleted(id: string): Promise<void> {
    await WebhookLog.findByIdAndUpdate(id, {
      $set: { status: WebhookLogStatus.COMPLETED },
    });
  }

  async getPendingRetries(): Promise<IWebhookLog[]> {
    return WebhookLog.find({
      status: WebhookLogStatus.PENDING,
      nextRetryAt: { $lte: new Date() },
    })
      .sort({ nextRetryAt: 1 })
      .limit(50)
      .exec();
  }

  private computeNextRetry(retryCount: number): Date {
    // Exponential backoff: 1s, 2s, 4s
    const delayMs = Math.pow(2, retryCount) * 1000;
    return new Date(Date.now() + delayMs);
  }
}

export const webhookRepository = new WebhookRepository();