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
import { cartService }    from "../../domains/cart/cart.service";
import redisClient        from "../../config/redis";

interface OrderStockCommittedEvent {
  orderId:  string;
  sagaId:   string;
  storeId:  string;
  userId:   string;
}

interface CartItemOutOfStockEvent {
  cartId:           string;
  sagaId:           string;
  unavailableItems: Array<{ productId: string; reason: string }>;
}

export const cartHandlers: Record<
  string,
  (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ) => Promise<void>
> = {
  [ROUTING_KEYS.ORDER_STOCK_COMMITTED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as OrderStockCommittedEvent;
    const { orderId, sagaId, storeId } = event;

    const idempotencyKey = `cart:clear:${sagaId ?? orderId}`;
    const acquired       = await redisClient.set(
      idempotencyKey,
      "1",
      "EX",
      3600,
      "NX"
    );

    if (!acquired) {
      logger.info("cart_handler_clear_duplicate_skipped", {
        event:   "cart_handler_clear_duplicate_skipped",
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
        await cartService.clearCartByStoreId(storeId);

        logger.info("cart_handler_cleared_on_stock_committed", {
          event:     "cart_handler_cleared_on_stock_committed",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          storeId,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("cart_handler_clear_failed", {
          event:     "cart_handler_clear_failed",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          storeId,
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

  [ROUTING_KEYS.CART_ITEM_OUT_OF_STOCK]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as CartItemOutOfStockEvent;
    const { cartId, sagaId, unavailableItems } = event;

    const idempotencyKey = `cart:unavailable:${sagaId}`;
    const acquired       = await redisClient.set(
      idempotencyKey,
      "1",
      "EX",
      3600,
      "NX"
    );

    if (!acquired) {
      logger.info("cart_handler_unavailable_duplicate_skipped", {
        event:   "cart_handler_unavailable_duplicate_skipped",
        service: SERVICE_NAME,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await cartService.markItemsUnavailable(cartId, unavailableItems);

        logger.info("cart_handler_items_marked_unavailable", {
          event:     "cart_handler_items_marked_unavailable",
          service:   SERVICE_NAME,
          cartId,
          sagaId,
          itemCount: unavailableItems?.length ?? 0,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("cart_handler_mark_unavailable_failed", {
          event:     "cart_handler_mark_unavailable_failed",
          service:   SERVICE_NAME,
          cartId,
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