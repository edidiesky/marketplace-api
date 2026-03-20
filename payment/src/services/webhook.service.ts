// services/webhook.service.ts
import { PaymentGateway, PaymentStatus } from "../models/Payment";
import { webhookRepository } from "../repository/WebhookRepository";
import {
  idempotencyRepository,
  IdempotencyRepository,
} from "../repository/IdempotencyRepository";
import { walletRepository } from "../repository/WalletRepository";
import { ledgerRepository } from "../repository/LedgerRepository";
import { paymentRepository } from "../repository/PaymentRepository";
import { createPaymentAdapter } from "../strategies";
import { sendPaymentMessage } from "../infra/messaging/producer";
import { PAYMENT_CONFIRMED_TOPIC, PAYMENT_FAILED_TOPIC } from "../constants";
import logger from "../utils/logger";
import { redisClient } from "../infra/cache/redis";
import { Types } from "mongoose";

const TIMEOUT_MS = 8000;

export class WebhookService {
  async process(
    gateway: PaymentGateway,
    rawBody: Record<string, any>,
    signature: string | undefined,
    skipSignatureVerification = false,
  ): Promise<void> {
    const adapter = createPaymentAdapter.getAdapter({ gateway });

    /**
     * verify the sign
     * extract the transaction id, amount, and status
     * check if the transaction id
     * add idemp check to prevent duplication
     * check if the amount matches
     * verify, and compare the status
     */
    if (!skipSignatureVerification && adapter.verifyWebhook) {
      const valid = adapter.verifyWebhook(rawBody, signature);
      if (!valid) throw new Error("Invalid webhook signature");
    }

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
      { transactionId, status },
    );

    const existing = await idempotencyRepository.find(idempotencyHash);
    if (existing) {
      logger.info("Duplicate webhook ignored", { transactionId, gateway });
      return;
    }

    const lockKey = `webhook:lock:${transactionId}`;
    const locked = await redisClient.getClient().setnx(lockKey, "1");
    if (!locked) {
      logger.warn("Webhook already being processed", { transactionId });
      throw new Error("Webhook processing in progress");
    }
    await redisClient.expire(lockKey, 40 * 4);

    try {
      // Step 5: Fetch payment record
      const payment =
        await paymentRepository.getPaymentByPaymentId(transactionId);
      if (!payment)
        throw new Error(`Payment not found for transaction: ${transactionId}`);

      // Step 6: Terminal state idempotency
      if (payment.status === PaymentStatus.SUCCESS && status === "success") {
        logger.info("Webhook ignored: already successful", { transactionId });
        return;
      }
      if (payment.status === PaymentStatus.FAILED && status === "failed") {
        logger.info("Webhook ignored: already failed", { transactionId });
        return;
      }

      // Step 7: Amount validation on success
      if (status === "success" && amount < payment.amount) {
        logger.error("Amount mismatch", {
          expected: payment.amount,
          received: amount,
          transactionId,
        });
        await paymentRepository.updatePaymentStatus(
          transactionId,
          PaymentStatus.FAILED,
          {
            failedAt: new Date(),
            metadata: { ...payment.metadata, failureReason: "Amount mismatch" },
          },
        );
        await sendPaymentMessage(PAYMENT_FAILED_TOPIC, {
          orderId: payment.orderId.toString(),
          sagaId: payment.sagaId,
          items: payment.metadata?.items ?? [],
          storeId: payment.storeId.toString(),
          reason: "Amount mismatch in webhook",
          failedAt: new Date().toISOString(),
        });
        throw new Error("Payment amount mismatch");
      }

      if (status === "success") {
        // Step 8a: Update payment status synchronously
        const updated = await paymentRepository.updatePaymentStatus(
          transactionId,
          PaymentStatus.SUCCESS,
          {
            paidAt: new Date(),
            metadata: {
              ...payment.metadata,
              gatewayConfirmation: {
                webhookPayload: rawBody,
                receivedAmount: amount,
                metadata,
              },
            },
          },
        );

        if (!updated) throw new Error("Failed to update payment status");

        // Step 9a: Write ledger CREDIT + FEE + update wallet synchronously
        try {
          const wallet = await walletRepository.getOrCreate(
            new Types.ObjectId(payment.ownerId.toString()),
            new Types.ObjectId(payment.storeId.toString()),
          );

          await ledgerRepository.creditOnPaymentConfirmed({
            sellerId: payment.ownerId,
            storeId: payment.storeId,
            walletId: wallet._id,
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            grossAmount: payment.amount,
          });

          logger.info("Ledger and wallet updated", {
            transactionId,
            grossAmount: payment.amount,
          });
        } catch (ledgerErr) {
          // Non-fatal: payment is already confirmed. Alert ops but do not
          // rethrow - we must still publish Kafka and return 200 to PSP.
          logger.error(
            "CRITICAL: Ledger write failed after payment confirmed",
            {
              transactionId,
              error:
                ledgerErr instanceof Error
                  ? ledgerErr.message
                  : String(ledgerErr),
            },
          );
        }

        // Step 10a: Publish payment.confirmed async to downstream services
        await sendPaymentMessage(PAYMENT_CONFIRMED_TOPIC, {
          orderId: payment.orderId.toString(),
          transactionId: payment.paymentId,
          sagaId: payment.sagaId,
          amount: payment.amount,
          items: payment.metadata?.items ?? [],
          storeId: payment.storeId.toString(),
          paymentDate: updated.paidAt!.toISOString(),
        });

        logger.info("payment.confirmed published", {
          transactionId,
          orderId: payment.orderId,
        });
      } else if (status === "failed") {
        // Step 8b: Update payment status synchronously
        await paymentRepository.updatePaymentStatus(
          transactionId,
          PaymentStatus.FAILED,
          {
            failedAt: new Date(),
            metadata: {
              ...payment.metadata,
              gatewayResponse:
                metadata.gateway_response ?? "Payment failed via webhook",
            },
          },
        );

        // Step 9b: Publish payment.failed async to downstream services
        await sendPaymentMessage(PAYMENT_FAILED_TOPIC, {
          orderId: payment.orderId.toString(),
          sagaId: payment.sagaId,
          items: payment.metadata?.items ?? [],
          storeId: payment.storeId.toString(),
          reason: metadata.gateway_response ?? "Payment failed via webhook",
          failedAt: new Date().toISOString(),
        });

        logger.info("payment.failed published", {
          transactionId,
          orderId: payment.orderId,
        });
      } else {
        // Non-terminal status: update metadata only, do not publish
        await paymentRepository.updatePaymentStatus(
          transactionId,
          payment.status,
          {
            metadata: { ...payment.metadata, lastWebhook: rawBody },
          },
        );

        logger.info("Non-terminal webhook status, metadata updated", {
          transactionId,
          status,
        });
        return;
      }

      await idempotencyRepository.save({
        requestHash: idempotencyHash,
        endpoint: `/webhook/${gateway}`,
        userId: "system" as any,
        responseBody: { transactionId, status },
        statusCode: 200,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      logger.error("Webhook processing failed", {
        transactionId,
        gateway,
        reason,
      });

      // Log for retry unless it is an amount mismatch (no point retrying)
      if (!reason.includes("Amount mismatch") && !reason.includes("already")) {
        await webhookRepository.logFailure({
          gateway,
          transactionId,
          rawPayload: rawBody,
          failureReason: reason,
        });
      }

      throw err;
    } finally {
      await redisClient.del(lockKey);
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

        // skipSignatureVerification = true because this payload was already
        // verified on the original attempt
        await this.process(log.gateway, log.rawPayload, undefined, true);
        await webhookRepository.markCompleted(log._id.toString());
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        await webhookRepository.incrementRetry(log._id.toString(), reason);
      }
    }
  }
}

export const webhookService = new WebhookService();
