import mongoose, { FilterQuery, Types } from "mongoose";
import { paymentRepository }   from "./payment.repository";
import { outboxRepository }    from "../outbox/outbox.repository";
import { walletRepository }    from "../wallet/wallet.repository";
import { ledgerRepository }    from "../ledger/ledger.repository";
import { idempotencyRepository } from "../../utils/idempotency";
import { createPaymentAdapter } from "../../strategies";
import { AppError }            from "../../utils/AppError";
import logger                  from "../../utils/logger";
import redisClient             from "../../config/redis";
import {
  SERVICE_NAME,
  ORDER_SERVICE_URL,
  TIMEOUT_MS,
  PLATFORM_FEE_RATE,
} from "../../constants";
import { requestContext }      from "../../context/requestContext";
import {
  publishPaymentCompleted,
  publishPaymentFailed,
  publishPaymentRefunded,
} from "../../messaging/publisher";
import { OutboxEventType }     from "../outbox/outbox.model";
import {
  InitializePaymentDto,
  InitializePaymentResponseDto,
  OrderSnapshotDto,
  PaymentListResponseDto,
  PaymentResponseDto,
  PaymentStatsDto,
} from "./payment.dto";
import {
  IPayment,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
} from "./payment.model";

function toDto(payment: IPayment): PaymentResponseDto {
  return {
    paymentId:     payment.paymentId,
    orderId:       payment.orderId.toString(),
    customerId:    payment.customerId.toString(),
    storeId:       payment.storeId.toString(),
    amount:        payment.amount,
    currency:      payment.currency,
    status:        payment.status,
    gateway:       payment.gateway,
    method:        payment.method,
    customerEmail: payment.customerEmail,
    customerName:  payment.customerName,
    sagaId:        payment.sagaId,
    paidAt:        payment.paidAt,
    failedAt:      payment.failedAt,
    refundedAt:    payment.refundedAt,
    createdAt:     payment.createdAt,
    updatedAt:     payment.updatedAt,
  };
}

function internalHeaders(): Record<string, string> {
  return {
    "Content-Type":      "application/json",
    "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
  };
}

async function fetchWithTimeout(
  url:  string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOrder(orderId: string): Promise<OrderSnapshotDto> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${ORDER_SERVICE_URL}/api/v1/orders/detail/${orderId}`,
      { method: "GET", headers: internalHeaders() }
    );
  } catch {
    throw AppError.internal("Order service is currently unavailable.");
  }

  if (!res.ok) {
    throw AppError.badRequest(`Order fetch failed: ${res.status}`);
  }

  const body = await res.json() as { data: OrderSnapshotDto };
  return body.data;
}

export const paymentService = {
  async initializePayment(
    dto: InitializePaymentDto
  ): Promise<InitializePaymentResponseDto> {
    const {
      orderId,
      gateway,
      customerEmail,
      customerName,
      customerId,
      phone,
      currency,
    } = dto;

    const session = await mongoose.startSession();
    let result!: InitializePaymentResponseDto;

    await session.withTransaction(async () => {
      const order = await fetchOrder(orderId);

      if (
        order.orderStatus !== "payment_pending" &&
        order.orderStatus !== "payment_initiated"
      ) {
        throw AppError.badRequest(
          `Order is not in a payable state: ${order.orderStatus}`
        );
      }

      const existing = await paymentRepository.findByOrderId(orderId, session);

      if (existing) {
        if (existing.status === PaymentStatus.SUCCESS) {
          throw AppError.conflict("Payment already completed for this order.");
        }
        if (existing.status === PaymentStatus.PENDING) {
          result = {
            paymentId:   existing.paymentId,
            redirectUrl: (existing.metadata?.["authorization_url"] as string) ?? "",
          };
          return;
        }
      }

      const callbackUrl = `${process.env.WEB_ORIGIN}/store/${order.storeId}/order/${orderId}`;
      const adapter     = createPaymentAdapter.getAdapter({ gateway });

      const { transactionId, success, message, redirectUrl } =
        await adapter.process({
          amount:      order.totalPrice,
          name:        customerName,
          phone:       phone ?? "",
          userId:      customerId,
          email:       customerEmail,
          currency:    currency ?? "NGN",
          callbackUrl,
        });

      if (!success || !transactionId) {
        throw AppError.badRequest(
          `Payment link creation failed with ${gateway}: ${message}`
        );
      }

      const payment = await paymentRepository.create(
        {
          orderId:    new Types.ObjectId(orderId),
          customerId: new Types.ObjectId(customerId),
          ownerId:    new Types.ObjectId(order.sellerId),
          storeId:    new Types.ObjectId(order.storeId),
          paymentId:  transactionId,
          amount:     order.totalPrice,
          currency:   currency ?? "NGN",
          status:     PaymentStatus.PENDING,
          gateway,
          method:     PaymentMethod.CARD,
          customerEmail,
          customerName,
          phone,
          sagaId:     order.sagaId,
          metadata:   { authorization_url: redirectUrl },
        },
        session
      );

      await outboxRepository.create(
        OutboxEventType.PAYMENT_INITIATED,
        {
          orderId,
          transactionId,
          sagaId: order.sagaId,
        },
        session
      );

      logger.info("payment_initialized", {
        event:     "payment_initialized",
        service:   SERVICE_NAME,
        paymentId: payment.paymentId,
        orderId,
        gateway,
        amount:    order.totalPrice,
        requestId: requestContext.get()?.requestId,
      });

      result = { paymentId: payment.paymentId, redirectUrl: redirectUrl! };
    });

    session.endSession();
    return result;
  },

  async getPaymentHistory(
    query: FilterQuery<IPayment>,
    page:  number,
    limit: number
  ): Promise<PaymentListResponseDto> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      paymentRepository.findAll(query, skip, limit),
      paymentRepository.count(query),
    ]);

    return {
      payments:   payments.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getPaymentById(id: string): Promise<PaymentResponseDto> {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw AppError.notFound("Payment not found.");
    return toDto(payment);
  },

  async getPaymentStats(
    storeId: string,
    days =   30
  ): Promise<PaymentStatsDto> {
    const endDate   = new Date();
    const startDate = new Date(
      endDate.getTime() - days * 24 * 60 * 60 * 1000
    );
    return paymentRepository.getStats(storeId, startDate, endDate);
  },

  async initiateRefund(
    paymentId: string,
    amount?:   number,
    reason =   "Customer requested refund"
  ): Promise<PaymentResponseDto> {
    const payment = await paymentRepository.findByPaymentId(paymentId);
    if (!payment) throw AppError.notFound("Payment not found.");

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw AppError.badRequest("Only successful payments can be refunded.");
    }

    const adapter = createPaymentAdapter.getAdapter({ gateway: payment.gateway });

    if (!("refund" in adapter) || typeof adapter.refund !== "function") {
      throw AppError.badRequest(
        `Refund not supported for gateway: ${payment.gateway}`
      );
    }

    const refundResult = await adapter.refund({
      transactionId: payment.paymentId,
      amount:        Number(amount ?? payment.amount),
      reason,
    });

    if (!refundResult.success) {
      throw AppError.badRequest(refundResult.message ?? "Refund failed at gateway.");
    }

    const updated = await paymentRepository.updateStatus(
      paymentId,
      PaymentStatus.REFUNDED,
      {
        refundedAt: new Date(),
        metadata:   { ...payment.metadata, refundResponse: refundResult },
      }
    );

    if (!updated) throw AppError.notFound("Payment not found.");

    publishPaymentRefunded({
      orderId:           payment.orderId.toString(),
      sagaId:            payment.sagaId,
      originalPaymentId: payment.paymentId,
      refundAmount:      amount ?? payment.amount,
      reason,
    });

    logger.info("payment_refund_initiated", {
      event:     "payment_refund_initiated",
      service:   SERVICE_NAME,
      paymentId,
      amount:    amount ?? payment.amount,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async markFailed(orderId: string): Promise<void> {
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) return;

    await paymentRepository.updateStatus(
      payment.paymentId,
      PaymentStatus.FAILED
    );

    logger.info("payment_marked_failed", {
      event:   "payment_marked_failed",
      service: SERVICE_NAME,
      orderId,
    });
  },

  async processWebhookSuccess(
    transactionId: string,
    amount:        number,
    rawBody:       Record<string, unknown>,
    metadata:      Record<string, unknown>,
    idempotencyHash: string,
    session:       mongoose.ClientSession
  ): Promise<void> {
    const payment = await paymentRepository.findByPaymentId(transactionId);
    if (!payment) throw AppError.notFound(`Payment not found: ${transactionId}`);

    if (amount < payment.amount) {
      await paymentRepository.updateStatus(
        transactionId,
        PaymentStatus.FAILED,
        { metadata: { ...payment.metadata, failureReason: "Amount mismatch" } },
        session
      );

      await outboxRepository.create(
        OutboxEventType.PAYMENT_FAILED,
        {
          orderId:  payment.orderId.toString(),
          sagaId:   payment.sagaId,
          storeId:  payment.storeId.toString(),
          reason:   "Amount mismatch in webhook",
          failedAt: new Date().toISOString(),
        },
        session
      );

      await idempotencyRepository.save(
        {
          requestHash:  idempotencyHash,
          endpoint:     `/webhook`,
          userId:       "system" as unknown as import("mongoose").Types.ObjectId,
          responseBody: { transactionId, status: "failed" },
          statusCode:   200,
        },
        session
      );

      throw AppError.badRequest("Payment amount mismatch.");
    }

    await paymentRepository.updateStatus(
      transactionId,
      PaymentStatus.SUCCESS,
      {
        paidAt:   new Date(),
        metadata: {
          ...payment.metadata,
          gatewayConfirmation: { webhookPayload: rawBody, receivedAmount: amount, metadata },
        },
      },
      session
    );

    const wallet = await walletRepository.getOrCreate(
      new Types.ObjectId(payment.ownerId.toString()),
      new Types.ObjectId(payment.storeId.toString()),
      session
    );

    await ledgerRepository.creditOnPaymentConfirmed(
      {
        sellerId:    payment.ownerId,
        storeId:     payment.storeId,
        walletId:    wallet._id,
        orderId:     payment.orderId,
        paymentId:   payment.paymentId,
        grossAmount: payment.amount,
      },
      session
    );

    await outboxRepository.create(
      OutboxEventType.PAYMENT_CONFIRMED,
      {
        orderId:       payment.orderId.toString(),
        transactionId: payment.paymentId,
        sagaId:        payment.sagaId,
        amount:        payment.amount,
        storeId:       payment.storeId.toString(),
        paymentDate:   new Date().toISOString(),
      },
      session
    );

    await idempotencyRepository.save(
      {
        requestHash:  idempotencyHash,
        endpoint:     `/webhook`,
        userId:       "system" as unknown as import("mongoose").Types.ObjectId,
        responseBody: { transactionId, status: "success" },
        statusCode:   200,
      },
      session
    );

    logger.info("payment_webhook_success_committed", {
      event:     "payment_webhook_success_committed",
      service:   SERVICE_NAME,
      transactionId,
      orderId:   payment.orderId.toString(),
    });
  },

  async processWebhookFailure(
    transactionId:    string,
    rawBody:          Record<string, unknown>,
    metadata:         Record<string, unknown>,
    idempotencyHash:  string,
    session:          mongoose.ClientSession
  ): Promise<void> {
    const payment = await paymentRepository.findByPaymentId(transactionId);
    if (!payment) throw AppError.notFound(`Payment not found: ${transactionId}`);

    await paymentRepository.updateStatus(
      transactionId,
      PaymentStatus.FAILED,
      {
        failedAt: new Date(),
        metadata: {
          ...payment.metadata,
          gatewayResponse: (metadata["gateway_response"] as string) ?? "Payment failed via webhook",
        },
      },
      session
    );

    await outboxRepository.create(
      OutboxEventType.PAYMENT_FAILED,
      {
        orderId:  payment.orderId.toString(),
        sagaId:   payment.sagaId,
        storeId:  payment.storeId.toString(),
        reason:   (metadata["gateway_response"] as string) ?? "Payment failed via webhook",
        failedAt: new Date().toISOString(),
      },
      session
    );

    await idempotencyRepository.save(
      {
        requestHash:  idempotencyHash,
        endpoint:     `/webhook`,
        userId:       "system" as unknown as import("mongoose").Types.ObjectId,
        responseBody: { transactionId, status: "failed" },
        statusCode:   200,
      },
      session
    );

    logger.info("payment_webhook_failure_committed", {
      event:         "payment_webhook_failure_committed",
      service:       SERVICE_NAME,
      transactionId,
      orderId:       payment.orderId.toString(),
    });
  },
};