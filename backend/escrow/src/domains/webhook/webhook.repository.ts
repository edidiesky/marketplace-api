import WebhookLog, { IWebhookLog, WebhookLogStatus } from "./webhook.model";
import { PaymentGateway }                             from "../payment/payment.model";

function computeNextRetry(retryCount: number): Date {
  const delayMs = Math.pow(2, retryCount) * 1_000;
  return new Date(Date.now() + delayMs);
}

export const webhookRepository = {
  async logFailure(data: {
    gateway:        PaymentGateway;
    transactionId:  string;
    rawPayload:     Record<string, unknown>;
    failureReason:  string;
  }): Promise<IWebhookLog> {
    return WebhookLog.create({
      ...data,
      retryCount:    0,
      lastAttemptAt: new Date(),
      nextRetryAt:   computeNextRetry(0),
      status:        WebhookLogStatus.PENDING,
    });
  },

  async incrementRetry(
    id:            string,
    failureReason: string
  ): Promise<IWebhookLog | null> {
    const log = await WebhookLog.findById(id);
    if (!log) return null;

    const newRetryCount       = log.retryCount + 1;
    const isPermanentFailure  = newRetryCount >= 3;

    return WebhookLog.findByIdAndUpdate(
      id,
      {
        $set: {
          retryCount:    newRetryCount,
          lastAttemptAt: new Date(),
          failureReason,
          status:        isPermanentFailure
            ? WebhookLogStatus.PERMANENT_FAILURE
            : WebhookLogStatus.PENDING,
          nextRetryAt: isPermanentFailure
            ? undefined
            : computeNextRetry(newRetryCount),
        },
      },
      { new: true }
    );
  },

  async markCompleted(id: string): Promise<void> {
    await WebhookLog.findByIdAndUpdate(id, {
      $set: { status: WebhookLogStatus.COMPLETED },
    });
  },

  async getPendingRetries(): Promise<IWebhookLog[]> {
    return WebhookLog.find({
      status:     WebhookLogStatus.PENDING,
      nextRetryAt: { $lte: new Date() },
    })
      .sort({ nextRetryAt: 1 })
      .limit(50)
      .exec();
  },
};