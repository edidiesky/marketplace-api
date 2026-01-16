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

    const idempotencyKey = `payment-success-${orderId}-${transactionId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) {
      logger.info("Duplicate payment success ignored", {
        event: "duplicate_order_payment",
        orderId,
        transactionId,
        paymentDate,
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
          return;
          // 
          // throw new Error("Order not found");
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

    let order;
    try {
      order = await orderService.updateOrderToOutOfStock(
        orderId,
        OrderStatus.OUT_OF_STOCK,
        { failureReason: reason }
      );

      if (!order) {
        logger.warn("Order not found when handling reservation failure", {
          orderId,
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
          cartId: order.cartId,
          sagaId,
          failedItemsCount: failedItems?.length || 0,
        });
      } catch (emitErr) {
        logger.error("Failed to emit CART_ITEM_OUT_OF_STOCK_TOPIC", {
          orderId,
          emitErr,
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
