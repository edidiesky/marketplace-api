import type { Channel, ConsumeMessage } from "amqplib";
import {
  SERVICE_NAME,
  ROUTING_KEYS,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import { requestContext } from "../../context/requestContext";
import logger             from "../../utils/logger";
import { orderService }   from "../../domains/order/order.service";
import redisClient        from "../../config/redis";

interface PaymentCompletedEvent {
  orderId:       string;
  transactionId: string;
  paymentDate:   string;
  sagaId:        string;
  storeId:       string;
  storeName?:    string;
}

interface PaymentInitiatedEvent {
  orderId:       string;
  transactionId: string;
  sagaId:        string;
}

interface PaymentFailedEvent {
  orderId:  string;
  reason:   string;
  sagaId:   string;
  userId:   string;
}

interface InventoryReservationFailedEvent {
  orderId:     string;
  sagaId:      string;
  reason:      string;
  failedItems: Array<{ productId: string; productTitle: string; reason: string }>;
}

export const orderHandlers: Record<
  string,
  (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ) => Promise<void>
> = {
  [ROUTING_KEYS.PAYMENT_COMPLETED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as PaymentCompletedEvent;
    const { orderId, transactionId, paymentDate, sagaId, storeName } = event;

    const idempotencyKey = `order:payment:success:${sagaId}`;
    const acquired = await redisClient.set(
      idempotencyKey, "1", "EX", 3600, "NX"
    );

    if (!acquired) {
      logger.info("order_handler_payment_completed_duplicate", {
        event:   "order_handler_payment_completed_duplicate",
        service: SERVICE_NAME,
        orderId,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await orderService.confirmPaymentSuccess(
          orderId,
          transactionId,
          new Date(paymentDate),
          storeName ?? "Selleasi Store"
        );

        logger.info("order_handler_payment_completed", {
          event:         "order_handler_payment_completed",
          service:       SERVICE_NAME,
          orderId,
          transactionId,
          sagaId,
          requestId:     requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("order_handler_payment_completed_failed", {
          event:     "order_handler_payment_completed_failed",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ROUTING_KEYS.PAYMENT_INITIATED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as PaymentInitiatedEvent;
    const { orderId, transactionId, sagaId } = event;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await orderService.markPaymentInitiated(orderId, transactionId);

        logger.info("order_handler_payment_initiated", {
          event:         "order_handler_payment_initiated",
          service:       SERVICE_NAME,
          orderId,
          transactionId,
          sagaId,
          requestId:     requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("order_handler_payment_initiated_failed", {
          event:     "order_handler_payment_initiated_failed",
          service:   SERVICE_NAME,
          orderId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ROUTING_KEYS.PAYMENT_FAILED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as PaymentFailedEvent;
    const { orderId, reason, sagaId } = event;

    const idempotencyKey = `order:payment:failed:${sagaId}`;
    const acquired = await redisClient.set(
      idempotencyKey, "1", "EX", 3600, "NX"
    );

    if (!acquired) {
      logger.info("order_handler_payment_failed_duplicate", {
        event:   "order_handler_payment_failed_duplicate",
        service: SERVICE_NAME,
        orderId,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await orderService.markPaymentFailed(orderId, reason);

        logger.info("order_handler_payment_failed_processed", {
          event:     "order_handler_payment_failed_processed",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          reason,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("order_handler_payment_failed_error", {
          event:     "order_handler_payment_failed_error",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ROUTING_KEYS.INVENTORY_RESERVATION_FAILED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as InventoryReservationFailedEvent;
    const { orderId, sagaId, reason, failedItems } = event;

    const idempotencyKey = `order:reservation:failed:${sagaId}`;
    const acquired = await redisClient.set(
      idempotencyKey, "1", "EX", 3600, "NX"
    );

    if (!acquired) {
      logger.info("order_handler_reservation_failed_duplicate", {
        event:   "order_handler_reservation_failed_duplicate",
        service: SERVICE_NAME,
        orderId,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await orderService.markOutOfStock(orderId, reason, failedItems);

        logger.info("order_handler_reservation_failed_processed", {
          event:           "order_handler_reservation_failed_processed",
          service:         SERVICE_NAME,
          orderId,
          sagaId,
          failedItemCount: failedItems?.length ?? 0,
          requestId:       requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("order_handler_reservation_failed_error", {
          event:     "order_handler_reservation_failed_error",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};