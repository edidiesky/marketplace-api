import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  EXPIRATION_SEC,
  JITTER,
  MAX_RETRIES,
  ORDER_PAYMENT_COMPLETED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import { Types } from "mongoose";

export const OrderTopic = {
  [ORDER_PAYMENT_COMPLETED_TOPIC]: async (data: any) => {
    const {
      productId,
      storeId,
      ownerId,
      sku,
      title,
      image,
      availableStock,
      thresholdStock,
      ownerName,
      idempotencyId,
    } = data;
    logger.info("order Onboarding data:", data);
    const requestId = idempotencyId || `${ownerId}-${productId}`;
    const idempKey = `order-onboard-${requestId}`;
    const is_locked = await redisClient.setnx(idempKey, "locked");
    if (!is_locked) {
      logger.warn("Duplicate order onboarding request detected", {
        requestId,
        ownerId,
        productId,
      });
      return;
    }

    await redisClient.expire(idempKey, EXPIRATION_SEC / 1000);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // const order = await orderService.(ownerId, {
        //   ownerId: new Types.ObjectId(ownerId),
        //   storeId: new Types.ObjectId(storeId),
        //   ownerName,
        //   ownerEmail: data.ownerEmail,
        //   productId,
        //   productTitle: title,
        //   productImage: image,
        //   quantityOnHand: availableStock,
        //   quantityAvailable: availableStock,
        //   quantityReserved: 0,
        //   sku,
        //   reorderPoint: thresholdStock,
        //   storeName: data.storeName,
        //   storeDomain: data.storeDomain,
        // });
        // logger.info("order created successfully", {
        //   ownerId,
        //   orderId: order._id,
        //   requestId,
        // });
        return;
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`order creation failed (attempt ${attempt + 1})`, {
            ownerId,
            error: error.message,
            stack: error.stack,
          });
        }
        if (attempt === MAX_RETRIES - 1) {
          logger.error("ALL RETRIES FAILED, Sending rollback", { ownerId });
          // await sendorderMessage(order_CREATION_FAILED_TOPIC, data);
        } else {
          const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  },
};
