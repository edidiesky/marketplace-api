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
} from "../constants";
import redisClient from "../config/redis";
import { sendOrderMessage } from "./producer";
import { OrderStatus } from "../models/Order";

export const OrderTopic = {
  [ORDER_PAYMENT_COMPLETED_TOPIC]: async (data: any) => {
    const { orderId, transactionId, paymentDate, sagaId } = data;
    const idempotencyKey = `payment-success-${sagaId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) {
      logger.info("Duplicate payment success ignored", {
        event: "duplicate_order_payment",
        orderId,
        transactionId,
        sagaId,
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
          logger.error("Order not found during payment completion", {
            orderId,
            transactionId,
            paymentDate,
            sagaId,
            event: "order_not_found_during_payment_completion",
          });
          return;
        }
        await sendOrderMessage(ORDER_COMPLETED_TOPIC, {
          orderId: order._id.toString(),
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
          sagaId,
        });
        return;
      } catch (error: any) {
        logger.error(
          `Payment success handling failed (attempt ${attempt + 1})`,
          {
            orderId,
            sagaId,
            error: error.message,
          }
        );

        if (attempt === MAX_RETRIES - 1) {
          logger.error("Final failure processing payment success", {
            orderId,
            sagaId,

          });
        } else {
          const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  },

  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, reason, sagaId } = data;

    const idempotencyKey = `payment-failed-${sagaId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) {
      logger.info("Duplicate payment failure event ignored", {
        orderId,
        sagaId,
      });
      return;
    }

    try {
      await orderService.markPaymentFailed(orderId, reason);
      logger.info("Payment failure processed", { orderId, reason, sagaId });
    } catch (error: any) {
      logger.error("Failed to handle payment failure", {
        orderId,
        sagaId,
        error: error.message,
      });
    }
  },

  [ORDER_RESERVATION_FAILED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, reason, userId, storeId, failedItems } = data;

    const idempotencyKey = `reservation-failed-${sagaId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) {
      logger.info("Duplicate reservation failed event ignored", {
        sagaId,
        orderId,
      });
      return;
    }

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

      try {
        await sendOrderMessage(CART_ITEM_OUT_OF_STOCK_TOPIC, {
          cartId: order.cartId.toString(),
          userId: order.userId.toString(),
          orderId: order._id.toString(),
          unavailableItems: failedItems || [],
          sagaId,
          failedAt: new Date().toISOString(),
        });

        logger.info("Cart notified of unavailable items", {
          orderId,
          cartId: order.cartId.toString(),
          sagaId,
          failedItemsCount: failedItems?.length || 0,
        });
      } catch (emitErr: any) {
        logger.error("Failed to emit CART_ITEM_OUT_OF_STOCK_TOPIC", {
          orderId,
          sagaId,
          error: emitErr.message,
        });
      }

      logger.info("Successfully handled reservation failure", {
        orderId,
        sagaId,
        reason,
        newStatus: order.orderStatus,
      });
    } catch (error: any) {
      logger.error("Failed to handle reservation failure", {
        orderId,
        sagaId,
        error: error.message,
      });
    }
  },
};