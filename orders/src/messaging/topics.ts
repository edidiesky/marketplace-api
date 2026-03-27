import logger from "../utils/logger";
import { orderService } from "../services/order.service";
import {
  MAX_RETRIES,
  BASE_DELAY_MS,
  JITTER,
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC,
  ORDER_RESERVATION_FAILED_TOPIC,
  CART_ITEM_OUT_OF_STOCK_TOPIC,
  ORDER_PAYMENT_INITIATED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import { sendOrderMessage } from "./producer";
import { OrderStatus } from "../models/Order";

export const OrderTopic = {
 [ORDER_PAYMENT_COMPLETED_TOPIC]: async (data: any) => {
  const { orderId, transactionId, paymentDate, sagaId, storeId, storeName } = data;

  const idempotencyKey = `payment-success-${sagaId}`;
  if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
    logger.info("Duplicate payment success ignored", { orderId, sagaId });
    return;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const order = await orderService.confirmPaymentSuccess(
        orderId,
        transactionId,
        new Date(paymentDate)
      );

      if (!order) {
        logger.error("Order not found during payment completion", {
          orderId,
          transactionId,
          sagaId,
        });
        return;
      }

      // Generate receipt async - failure does not block order completion
      const receiptUrl = await orderService.generateAndPersistReceipt(
        orderId,
        transactionId,
        new Date(paymentDate),
        storeName ?? "Selleasi Store"
      );

      await sendOrderMessage(ORDER_COMPLETED_TOPIC, {
        orderId: order._id.toString(),
        userId: order.userId.toString(),
        cartId: order.cartId.toString(),
        storeId: order.storeId.toString(),
        sagaId,
        receiptUrl: receiptUrl ?? null,
        completedAt: new Date().toISOString(),
      });

      logger.info("Order completed, receipt generated, event emitted", {
        event: "order_completed_emitted",
        orderId,
        transactionId,
        sagaId,
        receiptUrl,
      });
      return;
    } catch (error: any) {
      logger.error(`Payment success handling failed (attempt ${attempt + 1})`, {
        orderId,
        sagaId,
        error: error.message,
      });
      if (attempt === MAX_RETRIES - 1) {
        logger.error("All retries exhausted for payment success handling", {
          orderId,
          sagaId,
        });
        return;
      }
      const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
},

  [ORDER_PAYMENT_INITIATED_TOPIC]: async (data: {
    orderId: string;
    transactionId: string;
    sagaId: string;
  }) => {
    const { orderId, transactionId, sagaId } = data;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await orderService.markPaymentInitiated(orderId, transactionId);
        logger.info("Order marked payment initiated", { orderId, transactionId });
        return;
      } catch (error: any) {
        logger.error(`Mark payment initiated failed (attempt ${attempt + 1})`, {
          orderId,
          transactionId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for mark payment initiated", {
            orderId,
            transactionId,
          });
          return;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, reason, sagaId } = data;

    const idempotencyKey = `payment-failed-${sagaId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate payment failure event ignored", { orderId, sagaId });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await orderService.markPaymentFailed(orderId, reason);
        logger.info("Payment failure processed", { orderId, reason, sagaId });
        return;
      } catch (error: any) {
        logger.error(`Payment failure handling failed (attempt ${attempt + 1})`, {
          orderId,
          sagaId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for payment failure handling", {
            orderId,
            sagaId,
          });
          return;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ORDER_RESERVATION_FAILED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, reason, failedItems } = data;

    const idempotencyKey = `reservation-failed-${sagaId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate reservation failed event ignored", { sagaId, orderId });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const order = await orderService.updateOrderToOutOfStock(
          orderId,
          OrderStatus.OUT_OF_STOCK,
          { failureReason: reason }
        );

        if (!order) {
          logger.warn("Order not found when handling reservation failure", {
            orderId,
            sagaId,
          });
          return;
        }

        await sendOrderMessage(CART_ITEM_OUT_OF_STOCK_TOPIC, {
          cartId: order.cartId.toString(),
          userId: order.userId.toString(),
          orderId: order._id.toString(),
          unavailableItems: failedItems || [],
          sagaId,
          failedAt: new Date().toISOString(),
        });

        logger.info("Reservation failure handled and cart notified", {
          event: "reservation_failure_handled",
          orderId,
          sagaId,
          failedItemsCount: failedItems?.length || 0,
        });
        return;
      } catch (error: any) {
        logger.error(`Reservation failure handling failed (attempt ${attempt + 1})`, {
          orderId,
          sagaId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for reservation failure handling", {
            orderId,
            sagaId,
          });
          return;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};