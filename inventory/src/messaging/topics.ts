import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  EXPIRATION_SEC,
  JITTER,
  MAX_RETRIES,
  PRODUCT_ONBOARDING_COMPLETED_TOPIC,
} from "../constants";
import { inventoryService } from "../services/inventory.service";
import redisClient from "../config/redis";

export const InventoryTopic = {
  [PRODUCT_ONBOARDING_COMPLETED_TOPIC]: async (data: any) => {
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
    logger.info("Inventory Onboarding data:", data);
    const requestId = idempotencyId || `${ownerId}-${productId}`;
    const idempKey = `inventory-onboard-${requestId}`;
    const is_locked = await redisClient.setnx(idempKey, "locked");
    if (!is_locked) {
      logger.warn("Duplicate inventory onboarding request detected", {
        requestId,
        ownerId,
        productId,
      });
      return;
    }

    await redisClient.expire(idempKey, EXPIRATION_SEC / 1000);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const inventory = await inventoryService.createInventory(ownerId, {
          ownerId,
          storeId,
          ownerName,
          productId,
          productTitle: title,
          productImage: image,
          quantityOnHand: availableStock,
          quantityAvailable: availableStock,
          quantityReserved: 0,
          sku,
          reorderPoint: thresholdStock,
        });
        logger.info("Inventory created successfully", {
          ownerId,
          inventoryId: inventory._id,
          requestId,
        });
        return;
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Inventory creation failed (attempt ${attempt + 1})`, {
            ownerId,
            error: error.message,
            stack: error.stack,
          });
        }
        if (attempt === MAX_RETRIES - 1) {
          logger.error("ALL RETRIES FAILED, Sending rollback", { ownerId });
          // await sendInventoryMessage(Inventory_CREATION_FAILED_TOPIC, data);
        } else {
          const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  },
};
