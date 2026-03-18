// services/webhook.service.ts
import { PaymentGateway } from "../models/Payment";
import { webhookRepository } from "../repository/WebhookRepository";
import { idempotencyRepository, IdempotencyRepository } from "../repository/IdempotencyRepository";
import { createPaymentAdapter } from "../strategies";
import logger from "../utils/logger";
import { sendPaymentMessage } from "../infra/messaging/producer";
import { PAYMENT_WEBHOOK_PROCESSED_TOPIC } from "../constants";

const PAYMENT_SERVICE_INTERNAL_URL =
  process.env.PAYMENT_SERVICE_URL ?? "http://payment:4006";
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";
const TIMEOUT_MS = 8000;

export class WebhookService {
  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async process(
    gateway: PaymentGateway,
    rawBody: Record<string, any>,
    signature: string | undefined
  ): Promise<void> {
    const adapter = createPaymentAdapter.getAdapter({ gateway });

    // Step 1: Verify signature
    if (adapter.verifyWebhook) {
      const valid = adapter.verifyWebhook(rawBody, signature);
      if (!valid) throw new Error("Invalid webhook signature");
    }

    // Step 2: Extract fields
    if (
      !adapter.extractTransactionId ||
      !adapter.extractStatus ||
      !adapter.extractAmount
    ) {
      throw new Error(`Webhook parsing not supported for gateway: ${gateway}`);
    }

    const transactionId = adapter.extractTransactionId(rawBody);
    const status = adapter.extractStatus(rawBody);
    const amount = adapter.extractAmount(rawBody);
    const metadata = adapter.extractMetadata
      ? adapter.extractMetadata(rawBody)
      : {};

    if (!transactionId) throw new Error("Missing transaction reference");

    // Step 3: Idempotency check
    const idempotencyHash = IdempotencyRepository.buildHash(
      "POST",
      `/webhook/${gateway}`,
      "system",
      { transactionId, status }
    );

    const existing = await idempotencyRepository.find(idempotencyHash);
    if (existing) {
      logger.info("Duplicate webhook ignored", { transactionId, gateway });
      return;
    }

    // Step 4: Call payment service internal endpoint
    let logId: string | undefined;

    try {
      const endpoint =
        status === "success"
          ? `/api/v1/payments/internal/confirm`
          : `/api/v1/payments/internal/fail`;

      const res = await this.fetchWithTimeout(
        `${PAYMENT_SERVICE_INTERNAL_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": INTERNAL_SECRET,
          },
          body: JSON.stringify({
            transactionId,
            amount,
            metadata,
            gateway,
            rawPayload: rawBody,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json() as { message?: string };
        throw new Error(body.message ?? `Payment service returned ${res.status}`);
      }

      // Step 5: Save idempotency record on success
      await idempotencyRepository.save({
        requestHash: idempotencyHash,
        endpoint: `/webhook/${gateway}`,
        userId: "system" as any,
        responseBody: { transactionId, status },
        statusCode: 200,
      });

      // Step 6: Publish Kafka event
      await sendPaymentMessage(PAYMENT_WEBHOOK_PROCESSED_TOPIC, {
        transactionId,
        gateway,
        status,
        amount,
        processedAt: new Date().toISOString(),
      });

      logger.info("Webhook processed successfully", {
        transactionId,
        gateway,
        status,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      logger.error("Webhook processing failed", {
        transactionId,
        gateway,
        reason,
      });

      // Step 7: Log failure for retry
      const log = await webhookRepository.logFailure({
        gateway,
        transactionId,
        rawPayload: rawBody,
        failureReason: reason,
      });

      logId = log._id.toString();
      throw err;
    }
  }

  async retryFailed(): Promise<void> {
    const pending = await webhookRepository.getPendingRetries();

    for (const log of pending) {
      try {
        logger.info("Retrying failed webhook", {
          id: log._id,
          transactionId: log.transactionId,
          retryCount: log.retryCount,
        });

        await this.process(log.gateway, log.rawPayload, undefined);
        await webhookRepository.markCompleted(log._id.toString());
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        await webhookRepository.incrementRetry(log._id.toString(), reason);
      }
    }
  }
}

export const webhookService = new WebhookService();