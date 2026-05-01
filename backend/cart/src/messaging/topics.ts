import { cartService } from "../services/cart.service";
import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  CART_ITEM_OUT_OF_STOCK_TOPIC,
  JITTER,
  MAX_RETRIES,
  ORDER_STOCK_COMMITTED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";

export const CartTopic = {
  [ORDER_STOCK_COMMITTED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, storeId } = data;

    const idempotencyKey = `clear-cart-${sagaId || orderId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate cart clear ignored", { orderId, sagaId });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await cartService.clearCartByStoreId(storeId);
        logger.info("Cart cleared after stock committed", {
          event: "cart_cleared_on_stock_committed",
          orderId,
          sagaId,
          storeId,
        });
        return;
      } catch (error: any) {
        logger.error(`Cart clear failed (attempt ${attempt + 1})`, {
          orderId,
          sagaId,
          storeId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for cart clear", {
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

  [CART_ITEM_OUT_OF_STOCK_TOPIC]: async (data: any) => {
    const { cartId, unavailableItems, sagaId } = data;

    const idempotencyKey = `cart-unavailable-${sagaId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate cart unavailable event ignored", { sagaId });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await cartService.markItemsUnavailable(cartId, unavailableItems);
        logger.info("Cart items marked unavailable", {
          event: "cart_items_marked_unavailable",
          cartId,
          sagaId,
          itemCount: unavailableItems?.length || 0,
        });
        return;
      } catch (error: any) {
        logger.error(`Mark items unavailable failed (attempt ${attempt + 1})`, {
          cartId,
          sagaId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for mark items unavailable", {
            cartId,
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