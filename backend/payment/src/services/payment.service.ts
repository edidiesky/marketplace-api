import { FilterQuery, Types } from "mongoose";
import { IPaymentRepository } from "../repository/IPaymentRepository";
import { PaymentRepository } from "../repository/PaymentRepository";
import Payment, {
  IPayment,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
} from "../models/Payment";
import { sendPaymentMessage } from "../infra/messaging/producer";
import {
  ORDER_PAYMENT_REFUNDED_TOPIC,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import logger from "../utils/logger";
import { redisClient } from "../infra/cache/redis";
import withTransaction from "../utils/connectDB";
import { createPaymentAdapter } from "../strategies";
import { outboxRepository } from "../repository/OutboxRepository";
import { OutboxEventType } from "../models/OutboxEvent";

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL ?? "http://orders:4012";
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";
const TIMEOUT_MS = 8000;

interface OrderSnapshot {
  _id: string;
  userId: string;
  storeId: string;
  sellerId: string;
  totalPrice: number;
  orderStatus: string;
  sagaId: string;
}

interface InitializePaymentInput {
  orderId: string | Types.ObjectId | undefined;
  gateway: PaymentGateway | undefined;
  customerEmail: string | undefined;
  customerName: string | undefined;
  phone?: string;
  currency?: string;
  customerId: string;
}

class PaymentService {
  private repo: IPaymentRepository;
  private readonly CACHE_PREFIX = "payment:";
  private readonly CACHE_TTL = 300;

  constructor() {
    this.repo = new PaymentRepository();
  }

  private getCacheKey(paymentId: string): string {
    return `${this.CACHE_PREFIX}${paymentId}`;
  }

  private async writeCache(payment: IPayment): Promise<void> {
    try {
      await redisClient.set(
        this.getCacheKey(payment.paymentId),
        JSON.stringify(payment),
        "EX",
        this.CACHE_TTL,
      );
    } catch (err) {
      logger.warn("Payment cache write failed", {
        paymentId: payment.paymentId,
      });
    }
  }

  private async invalidateCache(paymentId: string): Promise<void> {
    try {
      await redisClient.del(this.getCacheKey(paymentId));
    } catch (err) {
      logger.warn("Payment cache invalidation failed", { paymentId });
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private internalHeaders() {
    return {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    };
  }

  private async fetchOrder(orderId: string): Promise<OrderSnapshot> {
    const res = await this.fetchWithTimeout(
      `${ORDER_SERVICE_URL}/api/v1/orders/detail/${orderId}`,
      { method: "GET", headers: this.internalHeaders() },
    );
    if (!res.ok) throw new Error(`ORDER_FETCH_FAILED:${res.status}`);
    return res.json() as Promise<OrderSnapshot>;
  }

  async initializePayment(input: InitializePaymentInput): Promise<{
    paymentId: string;
    redirectUrl: string;
  }> {
    const {
      orderId,
      gateway,
      customerEmail,
      customerName,
      phone,
      currency,
      customerId,
    } = input;

    if (!orderId || !gateway || !customerEmail || !customerName) {
      throw new Error("Missing required payment fields");
    }

    const orderIdStr = orderId.toString();

    return withTransaction(async (session) => {
      // Amount always sourced from order, never from client
      const order = await this.fetchOrder(orderIdStr);

      if (
        order.orderStatus !== "payment_pending" &&
        order.orderStatus !== "payment_initiated"
      ) {
        throw new Error(
          `Order is not in a payable state: ${order.orderStatus}`,
        );
      }

      const existingPayment = await this.repo.getPaymentByOrderId(
        orderIdStr,
        session,
      );

      if (existingPayment) {
        if (existingPayment.status === PaymentStatus.SUCCESS) {
          throw new Error("Payment already completed for this order");
        }
        if (existingPayment.status === PaymentStatus.PENDING) {
          return {
            paymentId: existingPayment.paymentId,
            redirectUrl: existingPayment.metadata?.authorization_url ?? "",
          };
        }
      }

      const callbackUrl = `${process.env.WEB_ORIGIN}/store/${order.storeId}/order/${orderIdStr}`;
      const paymentAdapter = createPaymentAdapter.getAdapter({ gateway });

      const { transactionId, success, message, redirectUrl } =
        await paymentAdapter.process({
          amount: order.totalPrice,
          name: customerName,
          phone: phone ?? "",
          userId: customerId,
          email: customerEmail,
          currency: currency ?? "NGN",
          callbackUrl,
        });

      if (!success || !transactionId) {
        throw new Error(
          `Payment link creation failed with ${gateway}: ${message}`,
        );
      }

      const payment = await this.repo.createPayment(
        {
          orderId: new Types.ObjectId(orderIdStr),
          customerId: new Types.ObjectId(customerId),
          ownerId: new Types.ObjectId(order.sellerId),
          storeId: new Types.ObjectId(order.storeId),
          paymentId: transactionId,
          amount: order.totalPrice,
          currency: currency ?? "NGN",
          status: PaymentStatus.PENDING,
          gateway,
          method: PaymentMethod.CARD,
          customerEmail,
          customerName,
          phone,
          sagaId: order.sagaId,
          metadata: { authorization_url: redirectUrl },
        },
        session,
      );

      await outboxRepository.create(
        OutboxEventType.PAYMENT_INITIATED,
        {
          orderId: orderIdStr,
          transactionId,
          sagaId: order.sagaId,
        },
        session,
      );

      await this.writeCache(payment);

      logger.info("Payment initialized", {
        paymentId: payment.paymentId,
        orderId: orderIdStr,
        gateway,
        amount: order.totalPrice,
      });
      return {
        paymentId: payment.paymentId,
        redirectUrl: redirectUrl!,
      };
    });
  }

  async getPaymentHistory(
    query: FilterQuery<IPayment>,
    skip: number,
    limit: number,
  ) {
    const [payments, totalCount] = await Promise.all([
      this.repo.getUserPayments(query, skip, limit),
      Payment.countDocuments(query),
    ]);

    return {
      data: {
        payments,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async getPaymentById(id: string): Promise<IPayment> {
    const payment = await this.repo.getPaymentById(id);
    if (!payment) {
      logger.warn("Payment was not found for the payment id:", {
        id,
      });
      throw new Error("Payment not found");
    }
    return payment;
  }

  async getPaymentStats(storeId: string, days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    return this.repo.getPaymentStats(storeId, startDate, endDate);
  }

  async initiateRefund(
    paymentId: string,
    amount?: number,
    reason = "Customer requested refund",
  ): Promise<IPayment> {
    const payment = await this.repo.getPaymentByPaymentId(paymentId);
    if (!payment) {
      logger.warn("Payment was not found for the payment id:", {
        paymentId,
      });
      throw new Error("Payment not found");
    }
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error("Only successful payments can be refunded");
    }

    const adapter = createPaymentAdapter.getAdapter({
      gateway: payment.gateway,
    });

    if (!("refund" in adapter) || typeof adapter.refund !== "function") {
      throw new Error(`Refund not supported for gateway: ${payment.gateway}`);
    }

    const refundResult = await adapter.refund({
      transactionId: payment.paymentId,
      amount: Number(amount ?? payment.amount),
      reason,
    });

    if (!refundResult.success) {
      throw new Error(refundResult.message ?? "Refund failed at gateway");
    }

    const updated = await this.repo.updatePaymentStatus(
      paymentId,
      PaymentStatus.REFUNDED,
      {
        refundedAt: new Date(),
        metadata: { ...payment.metadata, refundResponse: refundResult },
      },
    );

    if (!updated) throw new Error("Failed to update payment after refund");

    await this.invalidateCache(paymentId);

    await sendPaymentMessage(ORDER_PAYMENT_REFUNDED_TOPIC, {
      orderId: payment.orderId.toString(),
      sagaId: payment.sagaId,
      originalPaymentId: payment.paymentId,
      refundAmount: amount ?? payment.amount,
      reason,
    });

    return updated;
  }

  async markPaymentFailed(orderId: string): Promise<void> {
    const payment = await Payment.findOne({
      orderId: new Types.ObjectId(orderId),
    });
    if (!payment) return;

    await Payment.updateOne(
      { orderId: new Types.ObjectId(orderId) },
      {
        $set: {
          status: PaymentStatus.FAILED,
        },
      },
    );

    logger.info("Payment marked as cancelled", { orderId });
  }
}

export const paymentService = new PaymentService();
