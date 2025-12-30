import { cartService } from "../services/cart.service";
import logger from "../utils/logger";
import { ORDER_COMPLETED_TOPIC } from "../constants";
import redisClient from "../config/redis";

export const CartTopic = {
  [ORDER_COMPLETED_TOPIC]: async (data: any) => {
    const { cartId, userId, storeId } = data;

    const idempotencyKey = `clear-cart-${cartId}`;
    if (!await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX")) {
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
};