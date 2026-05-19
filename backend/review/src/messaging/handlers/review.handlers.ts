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
import redisClient        from "../../config/redis";

interface OrderCompletedEvent {
  orderId:      string;
  userId:       string;
  storeId:      string;
  sagaId:       string;
  cartId:       string;
  completedAt:  string;
}

export const reviewHandlers: Record<
  string,
  (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ) => Promise<void>
> = {
  [ROUTING_KEYS.ORDER_COMPLETED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as OrderCompletedEvent;
    const { orderId, sagaId } = event;

    const idempotencyKey = `review:order:completed:${sagaId}`;
    const acquired       = await redisClient.set(
      idempotencyKey,
      "1",
      "EX",
      3_600,
      "NX"
    );

    if (!acquired) {
      logger.info("review_handler_order_completed_duplicate", {
        event:   "review_handler_order_completed_duplicate",
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
        logger.info("review_handler_order_completed_received", {
          event:     "review_handler_order_completed_received",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("review_handler_order_completed_failed", {
          event:     "review_handler_order_completed_failed",
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