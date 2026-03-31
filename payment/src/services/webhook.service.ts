import { PaymentGateway, PaymentStatus } from "../models/Payment";
import { OutboxEventType } from "../models/OutboxEvent";
import { webhookRepository } from "../repository/WebhookRepository";
import {
  idempotencyRepository,
  IdempotencyRepository,
} from "../repository/IdempotencyRepository";
import { walletRepository } from "../repository/WalletRepository";
import { ledgerRepository } from "../repository/LedgerRepository";
import { paymentRepository } from "../repository/PaymentRepository";
import { outboxRepository } from "../repository/OutboxRepository";
import { createPaymentAdapter } from "../strategies";
import logger from "../utils/logger";
import { redisClient } from "../infra/cache/redis";
import { Types } from "mongoose";
import withTransaction from "../utils/connectDB";

export class WebhookService {
  async process(
    gateway: PaymentGateway,
    rawBody: Record<string, any>,
    signature: string | undefined,
    skipSignatureVerification = false
  ): Promise<void> {
    const adapter = createPaymentAdapter.getAdapter({ gateway });

    // Verify signature outside transaction (read-only, no DB writes)
    if (!skipSignatureVerification && adapter.verifyWebhook) {
      const valid = adapter.verifyWebhook(rawBody, signature);
      if (!valid) throw new Error("Invalid webhook signature");
    }

    if (
      !adapter.extractTransactionId ||
      !adapter.extractStatus ||
      !adapter.extractAmount
    ) {
      throw new Error(
        `Webhook parsing not supported for gateway: ${gateway}`
      );
    }

    const transactionId = adapter.extractTransactionId(rawBody);
    const status = adapter.extractStatus(rawBody);
    const amount = adapter.extractAmount(rawBody);
    const metadata = adapter.extractMetadata
      ? adapter.extractMetadata(rawBody)
      : {};

    if (!transactionId) throw new Error("Missing transaction reference");

    // Idempotency hash check outside transaction (read-only)
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

    // Redis lock outside transaction
    // Lock prevents concurrent processing of the same transaction
    // before the idempotency record is written
    const lockKey = `webhook:lock:${transactionId}`;
    const locked = await redisClient.getClient().setnx(lockKey, "1");
    if (!locked) {
      logger.warn("Webhook already being processed", { transactionId });
      throw new Error("Webhook processing in progress");
    }
    await redisClient.getClient().expire(lockKey, 60);

    try {
      // Fetch payment outside transaction (read-only)
      const payment =
        await paymentRepository.getPaymentByPaymentId(transactionId);
      if (!payment) {
        logger.warn((
          `Payment not found for transaction: ${transactionId}`
        ))
        throw new Error(
          `Payment not found for transaction: ${transactionId}`
        );
      }

      // Terminal state check outside transaction (read-only)
      if (
        payment.status === PaymentStatus.SUCCESS &&
        status === "success"
      ) {
        logger.info("Webhook ignored: already successful", {
          transactionId,
        });
        return;
      }
      if (
        payment.status === PaymentStatus.FAILED &&
        status === "failed"
      ) {
        logger.info("Webhook ignored: already failed", { transactionId });
        return;
      }

      if (status === "success") {
        // Amount validation before opening transaction
        if (amount < payment.amount) {
          logger.error("Amount mismatch", {
            expected: payment.amount,
            received: amount,
            transactionId,
          });

          // Single transaction: fail payment + write outbox event
          await withTransaction(async (session) => {
            await paymentRepository.updatePaymentStatus(
              transactionId,
              PaymentStatus.FAILED,
              {
                failedAt: new Date(),
                metadata: {
                  ...payment.metadata,
                  failureReason: "Amount mismatch",
                },
              },
              session
            );

            await outboxRepository.create(
              OutboxEventType.PAYMENT_FAILED,
              {
                orderId: payment.orderId.toString(),
                sagaId: payment.sagaId,
                items: payment.metadata?.items ?? [],
                storeId: payment.storeId.toString(),
                reason: "Amount mismatch in webhook",
                failedAt: new Date().toISOString(),
              },
              session
            );

            await idempotencyRepository.save(
              {
                requestHash: idempotencyHash,
                endpoint: `/webhook/${gateway}`,
                userId: "system" as any,
                responseBody: { transactionId, status: "failed" },
                statusCode: 200,
              },
              session
            );
          });

          throw new Error("Payment amount mismatch");
        }

        // Single transaction spanning all success writes
        await withTransaction(async (session) => {
          // Update payment status
          await paymentRepository.updatePaymentStatus(
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
            session
          );

          // Get or create wallet inside same transaction
          const wallet = await walletRepository.getOrCreate(
            new Types.ObjectId(payment.ownerId.toString()),
            new Types.ObjectId(payment.storeId.toString()),
            session
          );

          // Write ledger CREDIT + FEE + update wallet balance
          await ledgerRepository.creditOnPaymentConfirmed(
            {
              sellerId: payment.ownerId,
              storeId: payment.storeId,
              walletId: wallet._id,
              orderId: payment.orderId,
              paymentId: payment.paymentId,
              grossAmount: payment.amount,
            },
            session
          );

          // Write outbox even
          await outboxRepository.create(
            OutboxEventType.PAYMENT_CONFIRMED,
            {
              orderId: payment.orderId.toString(),
              transactionId: payment.paymentId,
              sagaId: payment.sagaId,
              amount: payment.amount,
              items: payment.metadata?.items ?? [],
              storeId: payment.storeId.toString(),
              paymentDate: new Date().toISOString(),
            },
            session
          );

          // Write idempotency record
          await idempotencyRepository.save(
            {
              requestHash: idempotencyHash,
              endpoint: `/webhook/${gateway}`,
              userId: "system" as any,
              responseBody: { transactionId, status: "success" },
              statusCode: 200,
            },
            session
          );
        });

        logger.info("Webhook success transaction committed", {
          transactionId,
          orderId: payment.orderId,
        });
      } else if (status === "failed") {
        // Single transaction: fail payment + write outbox event
        await withTransaction(async (session) => {
          await paymentRepository.updatePaymentStatus(
            transactionId,
            PaymentStatus.FAILED,
            {
              failedAt: new Date(),
              metadata: {
                ...payment.metadata,
                gatewayResponse:
                  metadata.gateway_response ??
                  "Payment failed via webhook",
              },
            },
            session
          );

          await outboxRepository.create(
            OutboxEventType.PAYMENT_FAILED,
            {
              orderId: payment.orderId.toString(),
              sagaId: payment.sagaId,
              items: payment.metadata?.items ?? [],
              storeId: payment.storeId.toString(),
              reason:
                metadata.gateway_response ?? "Payment failed via webhook",
              failedAt: new Date().toISOString(),
            },
            session
          );

          await idempotencyRepository.save(
            {
              requestHash: idempotencyHash,
              endpoint: `/webhook/${gateway}`,
              userId: "system" as any,
              responseBody: { transactionId, status: "failed" },
              statusCode: 200,
            },
            session
          );
        });

        logger.info("Webhook failure transaction committed", {
          transactionId,
          orderId: payment.orderId,
        });
      } else {
        // Non-terminal status: metadata update only, no transaction needed
        await paymentRepository.updatePaymentStatus(
          transactionId,
          payment.status,
          { metadata: { ...payment.metadata, lastWebhook: rawBody } }
        );

        logger.info("Non-terminal webhook status, metadata updated", {
          transactionId,
          status,
        });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      logger.error("Webhook processing failed", {
        transactionId,
        gateway,
        reason,
      });

      if (
        !reason.includes("Amount mismatch") &&
        !reason.includes("already") &&
        !reason.includes("processing in progress")
      ) {
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