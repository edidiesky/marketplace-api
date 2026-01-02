import mongoose, { FilterQuery, Types } from "mongoose";
import { IPaymentRepository } from "../repository/IPaymentRepository";
import { PaymentRepository } from "../repository/PaymentRepository";
import Payment, {
  IPayment,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
} from "../models/Payment";
import { sendPaymentMessage } from "../messaging/producer";
import {
  JITTER,
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC,
  ORDER_PAYMENT_REFUNDED_TOPIC,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { requestCoalescer } from "../utils/requestCoalescer";
import withTransaction from "../utils/connectDB";
import { createPaymentAdapter } from "../adapters";
import { v4 } from "uuid";

class PaymentService {
  private CACHE_TTL: number;
  private repo: IPaymentRepository;
  private readonly CACHE_PREFIX = "payment:";
  constructor() {
    this.CACHE_TTL = this.getRandomJitter(60 * 60 * 24);
    this.repo = new PaymentRepository();
  }

  private getRandomJitter(base: number, variance = 0.1): number {
    return (
      base + Math.floor(Math.random() * base * variance * 2 - base * variance)
    );
  }

  private getLatestVersionKey(paymentId: string): string {
    return `${this.CACHE_PREFIX}latest:${paymentId}`;
  }

  private getVersionKey(paymentId: string, version: number): string {
    return `${this.CACHE_PREFIX}v:${paymentId}:${version}`;
  }

  private async addToCache(payment: IPayment): Promise<void> {
    if (!payment._id || !payment.version) return;

    const latestKey = this.getLatestVersionKey(payment.paymentId);
    const versionKey = this.getVersionKey(payment.paymentId, payment.version);

    try {
      await Promise.all([
        redisClient.set(
          latestKey,
          payment.version.toString(),
          "EX",
          this.CACHE_TTL
        ),
        redisClient.set(
          versionKey,
          JSON.stringify(payment),
          "EX",
          this.CACHE_TTL
        ),
      ]);
    } catch (error) {
      logger.warn("Failed to cache payment", {
        paymentId: payment.paymentId,
        error,
      });
    }
  }

  async initializePayment<T>(body: Partial<IPayment>) {
    const {
      orderId,
      gateway,
      customerEmail,
      amount,
      phone,
      customerName,
      customerId,
      currency,
      storeId,
      ownerId,
    } = body;
    let newOrderId = orderId?.toString();
    const callbackUrl =
      process.env.NODE_ENV === "development"
        ? `${process.env.WEB_ORIGIN}/store/${storeId}/order`
        : ``;

    return withTransaction(
      async (session): Promise<Partial<IPayment> | null> => {
        const existingPayment = await this.repo.getPaymentByOrderId(
          newOrderId!,
          session
        );

        if (existingPayment) {
          if (existingPayment.status === PaymentStatus.SUCCESS) {
            throw new Error("Payment already completed for this order");
          }

          // If pending, return existing initialization
          if (existingPayment.status === PaymentStatus.PENDING) {
            return {
              paymentId: existingPayment.paymentId,
              redirectUrl: existingPayment.metadata?.authorization_url,
            };
          }
        }

        if (!gateway) {
          logger.error("Payment gateway was not configured");
          throw new Error("Payment gateway was not configured!");
        }

        const paymentAdapter = createPaymentAdapter.getAdapter({ gateway });

        const { transactionId, success, message, redirectUrl } =
          await paymentAdapter.process({
            amount: amount!,
            name: customerName!,
            phone: phone!,
            userId: customerId?.toString()!,
            email: customerEmail!,
            currency: currency!,
            callbackUrl,
          });

        if (!success) {
          logger.error(
            `creating a payment link with ${gateway.toUpperCase()}`,
            {
              message: message,
              userId: customerId,
              storeId,
              orderId,
              event: "payment_gateway_link_error",
            }
          );
          throw new Error(
            `We had a problem creating a payment link with ${gateway.toUpperCase()}. Please kindly try again, nce the issue gets resolved.`
          );
        }

        const paymentData: Partial<IPayment> = {
          orderId: new mongoose.Types.ObjectId(orderId),
          customerId: new mongoose.Types.ObjectId(customerId),
          ownerId: new mongoose.Types.ObjectId(ownerId),
          storeId: new mongoose.Types.ObjectId(storeId),
          paymentId: transactionId,
          amount,
          currency: "NGN",
          status: PaymentStatus.PENDING,
          gateway,
          method: PaymentMethod.CARD,
          customerEmail,
          customerName,
          sagaId: v4(),
        };

        const payment = await this.repo.createPayment(paymentData, session);

        logger.info("Payment initialized", {
          paymentId: payment.paymentId,
          orderId,
          gateway,
        });

        await this.addToCache(payment);

        return {
          paymentId: payment.paymentId,
          redirectUrl: redirectUrl!,
        };
      }
    );
  }

  /**
   * @description Service to handle Payment failure
   */

  async handlePaymentFailure(paymentId: string, reason: string): Promise<void> {
    const payment = await this.repo.getPaymentByPaymentId(paymentId);
    if (!payment || payment.status === PaymentStatus.FAILED) return;

    await this.repo.updatePaymentStatus(paymentId, PaymentStatus.FAILED, {
      failedAt: new Date(),
    });

    await sendPaymentMessage(ORDER_PAYMENT_FAILED_TOPIC, {
      orderId: payment.orderId.toString(),
      sagaId: payment.sagaId,
      reason,
    });

    logger.info("Payment failure processed", { paymentId, reason });
  }

  async confirmPaymentSuccess(
    paymentId: string,
    gatewayData?: any
  ): Promise<IPayment> {
    const coalesceKey = `confirm:payment:${paymentId}`;
    return requestCoalescer.coalesce(coalesceKey, async () => {
      const payment = await this.repo.getPaymentByPaymentId(paymentId);
      if (!payment) throw new Error("Payment not found");

      if (payment.status === PaymentStatus.SUCCESS) {
        logger.info("Payment already confirmed", { paymentId });
        return payment;
      }

      const updated = await this.repo.updatePaymentStatus(
        paymentId,
        PaymentStatus.SUCCESS,
        {
          paidAt: new Date(),
          metadata: { ...payment.metadata, gatewayConfirmation: gatewayData },
          version: (payment.version || 1) + 1,
        }
      );

      if (!updated) throw new Error("Failed to confirm payment");

      await this.addToCache(updated);

      await sendPaymentMessage(ORDER_PAYMENT_COMPLETED_TOPIC, {
        orderId: payment.orderId.toString(),
        paymentId: payment.paymentId,
        sagaId: payment.sagaId,
        amount: payment.amount,
        paidAt: updated.paidAt!.toISOString(),
      });

      logger.info("Payment confirmed and event emitted", {
        event: "payment_confirmed",
        paymentId,
        orderId: payment.orderId,
      });

      return updated;
    });
  }

  /**
   * @description Service to handle Payment histories
   */

  async getPaymentHistory(
    query: FilterQuery<IPayment>,
    skip: number,
    limit: number
  ) {
    const [payments, totalCount] = await Promise.all([
      this.repo.getUserPayments(query, skip, limit),
      Payment.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    logger.info("User Payment has been fetched succesfully:", {
      event: "user_payment_successfully_fetched",
      orderLength: Payment?.length,
      query,
      limit,
    });
    return {
      data: {
        payments,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async getPaymentById(id: string): Promise<IPayment> {
    const payment = await this.repo.getPaymentById(id);
    if (!payment) {
      logger.error("Payment not found", {
        id,
      });
      throw new Error("Payment not found");
    }
    return payment;
  }

  // 9. Get Payment Stats
  async getPaymentStats(storeId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    return this.repo.getPaymentStats(storeId, startDate, endDate);
  }

  /**
   * @description Service to refund user payemnt
   * @param paymentId
   * @param amount
   * @param reason
   * @returns
   */
  async initiateRefund(
    paymentId: string,
    amount?: number,
    reason: string = "Customer requested refund"
  ): Promise<IPayment> {
    const payment = await this.repo.getPaymentByPaymentId(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== PaymentStatus.SUCCESS)
      throw new Error("Only successful payments can be refunded");

    const adapter = createPaymentAdapter.getAdapter({
      gateway: payment.gateway,
    });

    if (!("refund" in adapter) || typeof adapter.refund !== "function") {
      throw new Error(`Refund not supported for gateway: ${payment.gateway}`);
    }

    const refundResult = await adapter.refund({
      transactionId: payment.paymentId,
      amount: Number(amount || payment.amount),
      reason,
    });

    if (!refundResult.success) {
      throw new Error(refundResult.message || "Refund failed at gateway");
    }

    const updated = await this.repo.updatePaymentStatus(
      paymentId,
      PaymentStatus.REFUNDED,
      {
        refundedAt: new Date(),
        metadata: { ...payment.metadata, refundResponse: refundResult },
      }
    );

    if (updated) {
      await sendPaymentMessage(ORDER_PAYMENT_REFUNDED_TOPIC, {
        orderId: payment.orderId.toString(),
        sagaId: payment.sagaId,
        originalPaymentId: payment.paymentId,
        refundAmount: amount || payment.amount,
        reason,
      });
    }

    return updated!;
  }

  /**
   * @description Handles incoming webhook from payment gateways
   * @param gateway - The payment gateway (paystack, flutterwave, etc.)
   * @param body - Raw webhook payload from the gateway
   * @param signature - Webhook signature from headers (e.g., x-paystack-signature)
   * @returns The updated IPayment document
   */
  async handleWebhook(
    gateway: PaymentGateway,
    body: any,
    signature?: string
  ): Promise<IPayment> {
    const adapter = createPaymentAdapter.getAdapter({ gateway });

    if (adapter.verifyWebhook) {
      const isValid = adapter.verifyWebhook(body, signature);
      if (!isValid) {
        logger.warn("Invalid webhook signature", {
          gateway,
          signatureProvided: !!signature,
        });
        throw new Error("Invalid webhook signature");
      }
    } else if (signature) {
      logger.warn(
        "Webhook signature received but adapter does not support verification",
        { gateway }
      );
    }

    if (
      !adapter.extractTransactionId ||
      !adapter.extractStatus ||
      !adapter.extractAmount
    ) {
      logger.error(`Webhook parsing not supported for gateway: ${gateway}`);
      throw new Error(`Webhook parsing not supported for gateway: ${gateway}`);
    }

    const transactionId = adapter.extractTransactionId(body);
    const status = adapter.extractStatus(body);
    const amount = adapter.extractAmount(body);
    const metadata = adapter.extractMetadata
      ? adapter.extractMetadata(body)
      : {};

    if (!transactionId) {
      logger.error(
        "Could not extract transaction reference from webhook payload"
      );
      throw new Error(
        "Could not extract transaction reference from webhook payload"
      );
    }

    const lockKey = `payment:lock:${transactionId}`;
    const lockAcquired = await redisClient.setnx(lockKey, "LOCKED");
    if (!lockAcquired) {
      logger.warn("Webhook processing in progress", { transactionId });
      throw new Error("Payment already has been processed");
    }

    // 3. Find payment record
    const payment = await this.repo.getPaymentByPaymentId(transactionId);
    if (!payment) {
      logger.error("Payment record not found for webhook", {
        transactionId,
        gateway,
      });
      throw new Error("Payment not found");
    }

    // 4. Idempotency: Prevent duplicate processing
    if (payment.status === PaymentStatus.SUCCESS && status === "success") {
      logger.info("Webhook ignored: payment already successful", {
        paymentId: payment.paymentId,
      });
      return payment;
    }

    if (payment.status === PaymentStatus.FAILED && status === "failed") {
      logger.info("Webhook ignored: payment already failed", {
        paymentId: payment.paymentId,
      });
      return payment;
    }

    if (status === "success" && amount < payment.amount) {
      logger.error("Webhook amount mismatch", {
        expected: payment.amount,
        received: amount,
        paymentId: payment.paymentId,
      });
      await this.handlePaymentFailure(
        transactionId,
        "Amount mismatch in webhook"
      );
      throw new Error("Payment amount mismatch");
    }

    if (status === "success") {
      logger.info("Processing successful webhook", {
        paymentId: payment.paymentId,
        amount,
        gateway,
      });

      return await this.confirmPaymentSuccess(transactionId, {
        webhookPayload: body,
        receivedAmount: amount,
        metadata,
      });
    }

    if (status === "failed") {
      logger.info("Processing failed webhook", {
        paymentId: payment.paymentId,
        gateway,
      });
      await this.handlePaymentFailure(
        transactionId,
        metadata.gateway_response || "Payment failed via webhook"
      );
      return payment;
    }

    logger.info("Webhook received with non-terminal status", {
      status,
      paymentId: payment.paymentId,
    });

    await this.repo.updatePaymentStatus(transactionId, payment.status, {
      metadata: { ...payment.metadata, lastWebhook: body },
    });

    return payment;
  }
}

export const paymentService = new PaymentService();
