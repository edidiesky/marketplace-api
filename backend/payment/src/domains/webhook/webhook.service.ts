import mongoose              from "mongoose";
import { createPaymentAdapter } from "../../strategies";
import { idempotencyRepository } from "../../utils/idempotency";
import { webhookRepository } from "./webhook.repository";
import { paymentRepository } from "../payment/payment.repository";
import { paymentService }    from "../payment/payment.service";
import { AppError }          from "../../utils/AppError";
import logger                from "../../utils/logger";
import redisClient           from "../../config/redis";
import { SERVICE_NAME }      from "../../constants";
import { PaymentGateway, PaymentStatus } from "../payment/payment.model";

export const webhookService = {
  async process(
    gateway:                   PaymentGateway,
    rawBody:                   Record<string, unknown>,
    signature:                 string | undefined,
    skipSignatureVerification = false
  ): Promise<void> {
    const adapter = createPaymentAdapter.getAdapter({ gateway });

    if (!skipSignatureVerification && adapter.verifyWebhook) {
      const valid = adapter.verifyWebhook(rawBody, signature);
      if (!valid) throw AppError.badRequest("Invalid webhook signature.");
    }

    if (
      !adapter.extractTransactionId ||
      !adapter.extractStatus        ||
      !adapter.extractAmount
    ) {
      throw AppError.badRequest(
        `Webhook parsing not supported for gateway: ${gateway}`
      );
    }

    const transactionId = adapter.extractTransactionId(rawBody);
    const status        = adapter.extractStatus(rawBody);
    const amount        = adapter.extractAmount(rawBody);
    const metadata      = adapter.extractMetadata
      ? adapter.extractMetadata(rawBody)
      : {};

    if (!transactionId) {
      throw AppError.badRequest("Missing transaction reference.");
    }

    const idempotencyHash = idempotencyRepository.buildHash(
      "POST",
      `/webhook/${gateway}`,
      "system",
      { transactionId, status }
    );

    const existing = await idempotencyRepository.find(idempotencyHash);
    if (existing) {
      logger.info("webhook_duplicate_ignored", {
        event:         "webhook_duplicate_ignored",
        service:       SERVICE_NAME,
        transactionId,
        gateway,
      });
      return;
    }

    const lockKey = `webhook:lock:${transactionId}`;
    const locked  = await redisClient.setnx(lockKey, "1");
    if (!locked) {
      throw AppError.conflict("Webhook processing in progress.");
    }
    await redisClient.expire(lockKey, 60);

    try {
      const payment = await paymentRepository.findByPaymentId(transactionId);
      if (!payment) {
        throw AppError.notFound(
          `Payment not found for transaction: ${transactionId}`
        );
      }

      if (
        (payment.status === PaymentStatus.SUCCESS && status === "success") ||
        (payment.status === PaymentStatus.FAILED  && status === "failed")
      ) {
        logger.info("webhook_terminal_state_ignored", {
          event:         "webhook_terminal_state_ignored",
          service:       SERVICE_NAME,
          transactionId,
          status,
        });
        return;
      }

      if (status === "success") {
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
          await paymentService.processWebhookSuccess(
            transactionId,
            amount,
            rawBody,
            metadata,
            idempotencyHash,
            session
          );
        });
        session.endSession();
      } else if (status === "failed") {
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
          await paymentService.processWebhookFailure(
            transactionId,
            rawBody,
            metadata,
            idempotencyHash,
            session
          );
        });
        session.endSession();
      } else {
        await paymentRepository.updateStatus(
          transactionId,
          payment.status,
          { metadata: { ...payment.metadata, lastWebhook: rawBody } }
        );
        logger.info("webhook_non_terminal_metadata_updated", {
          event:         "webhook_non_terminal_metadata_updated",
          service:       SERVICE_NAME,
          transactionId,
          status,
        });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error("webhook_processing_failed", {
        event:         "webhook_processing_failed",
        service:       SERVICE_NAME,
        transactionId,
        gateway,
        reason,
      });

      if (
        !reason.includes("Amount mismatch")      &&
        !reason.includes("already")              &&
        !reason.includes("processing in progress")
      ) {
        await webhookRepository.logFailure({
          gateway,
          transactionId,
          rawPayload:   rawBody,
          failureReason: reason,
        });
      }

      throw err;
    } finally {
      await redisClient.del(lockKey);
    }
  },

  async retryFailed(): Promise<void> {
    const pending = await webhookRepository.getPendingRetries();

    for (const log of pending) {
      try {
        await webhookService.process(
          log.gateway,
          log.rawPayload,
          undefined,
          true
        );
        await webhookRepository.markCompleted(log._id.toString());
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        await webhookRepository.incrementRetry(log._id.toString(), reason);
      }
    }
  },
};