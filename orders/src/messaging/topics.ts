import logger from "../utils/logger";
import { orderService } from "../services/order.service";
import {
  MAX_RETRIES,
  BASE_DELAY_MS,
  JITTER,
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import { sendOrderMessage } from "./producer";

export const OrderTopic = {
  [ORDER_PAYMENT_COMPLETED_TOPIC]: async (data: any) => {
    const { orderId, transactionId, paymentDate, sagaId } = data;

    const idempotencyKey = `payment-success-${orderId}-${transactionId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) {
      logger.info("Duplicate payment success ignored", {
        event: "duplicate_order_payment",
        orderId,
        transactionId,
        paymentDate
      });
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
          logger.error("Order was not found:", {
            orderId,
            transactionId,
            paymentDate,
            event: "order_not_found_during_payment_completion",
          });
          throw new Error("Order not found");
        }

        await sendOrderMessage(ORDER_COMPLETED_TOPIC, {
          orderId: order._id,
          userId: order.userId.toString(),
          cartId: order.cartId.toString(),
          storeId: order.storeId.toString(),
          sagaId,
          completedAt: new Date().toISOString(),
        });

        logger.info("Order completed and event emitted", {
          orderId,
          event: "order_completed_emitted",
          paymentDate,
          transactionId,
        });
        return;
      } catch (error) {
        logger.error(
          `Payment success handling failed (attempt ${attempt + 1})`,
          {
            orderId,
            error,
          }
        );

        if (attempt === MAX_RETRIES - 1) {
          // Optional: send to alert system
          logger.error("Final failure processing payment success", { orderId });
        } else {
          const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  },

  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, reason, sagaId } = data;

    const idempotencyKey = `payment-failed-${orderId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) return;

    try {
      await orderService.markPaymentFailed(orderId);

      // Optionally emit to inventory to release stock early
      await sendOrderMessage(ORDER_PAYMENT_FAILED_TOPIC, {
        orderId,
        reason,
        sagaId,
        failedAt: new Date().toISOString(),
      });

      logger.info("Payment failed processed", { orderId, reason });
    } catch (error) {
      logger.error("Failed to handle payment failure", { orderId, error });
    }
  },
};
