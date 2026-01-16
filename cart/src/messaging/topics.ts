import { cartService } from "../services/cart.service";
import logger from "../utils/logger";
import {
  CART_ITEM_OUT_OF_STOCK_TOPIC,
  ORDER_COMPLETED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";

export const CartTopic = {
  [ORDER_COMPLETED_TOPIC]: async (data: any) => {
    const { cartId, userId, storeId } = data;

    const idempotencyKey = `clear-cart-${cartId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      return;
    }

    try {
      await cartService.clearCartById(cartId);

      logger.info("Cart cleared after successful order", {
        event: "cart_cleared_on_order_completion",
        cartId,
        userId,
        storeId,
      });
    } catch (error) {
      logger.error("Failed to clear cart", { cartId, error });
    }
  },

  [CART_ITEM_OUT_OF_STOCK_TOPIC]: async (data: any) => {
    const { cartId, unavailableItems, sagaId } = data;
    // unavailableItems: [{ productId, reason }]

    // Idempotency check
    const idempotencyKey = `cart-unavailable-${sagaId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) return;

    // Mark items as unavailable (don't delete)
    await cartService.markItemsUnavailable(cartId, unavailableItems);
  },
};
