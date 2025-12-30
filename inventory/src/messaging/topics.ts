import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  EXPIRATION_SEC,
  JITTER,
  MAX_RETRIES,
  ORDER_CHECKOUT_STARTED_TOPIC,
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC,
  ORDER_RESERVATION_FAILED_TOPIC,
  PRODUCT_ONBOARDING_COMPLETED_TOPIC,
} from "../constants";
import { inventoryService } from "../services/inventory.service";
import redisClient from "../config/redis";
import { Types } from "mongoose";
import { sendInventoryMessage } from "./producer";

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
          ownerId: new Types.ObjectId(ownerId),
          storeId: new Types.ObjectId(storeId),
          ownerName,
          ownerEmail: data.ownerEmail,
          productId,
          productTitle: title,
          productImage: image,
          quantityOnHand: availableStock,
          quantityAvailable: availableStock,
          quantityReserved: 0,
          sku,
          reorderPoint: thresholdStock,
          storeName: data.storeName,
          storeDomain: data.storeDomain,
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

  [ORDER_CHECKOUT_STARTED_TOPIC]: async (data: any) => {
    const { orderId, storeId, items, sagaId, userId } = data;

    const idempotencyKey = `reserve-${sagaId || orderId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 900, "NX");
    if (!locked) {
      logger.info("Duplicate reservation attempt ignored", {
        event: "duplicate_order",
        orderId,
        sagaId,
      });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Reserve all items
        for (const item of items) {
          await inventoryService.reserveStock(
            item.productId,
            storeId,
            item.quantity,
            sagaId
          );
        }

        logger.info("All items reserved successfully", {
          event: "reservation_success",
          orderId,
          sagaId,
          itemCount: items.length,
        });
        return;
      } catch (error: any) {
        if (
          error.message.includes("INSUFFICIENT_STOCK") ||
          error.message.includes("STOCK_CONTENTION")
        ) {
          logger.warn("Reservation failed - insufficient or contended stock", {
            orderId,
            sagaId,
            error: error.message,
          });

          // Emit failure event
          try {
            await sendInventoryMessage(ORDER_RESERVATION_FAILED_TOPIC, {
              orderId,
              sagaId,
              userId,
              storeId,
              reason: error.message,
              failedAt: new Date().toISOString(),
            });
          } catch (emitErr) {
            logger.error("Failed to emit reservation failed", { emitErr });
          }
          return;
        }

        logger.error(`Reservation failed (attempt ${attempt + 1})`, { error });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("Final reservation failure", { orderId, sagaId });
        } else {
          await new Promise((r) =>
            setTimeout(r, Math.pow(2, attempt) * BASE_DELAY_MS + JITTER)
          );
        }
      }
    }
  },

  [ORDER_PAYMENT_COMPLETED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, items, storeId } = data;

    const idempotencyKey = `commit-${sagaId || orderId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate commit ignored", { orderId });
      return;
    }

    try {
      for (const item of items) {
        await inventoryService.commitStock(
          item.productId,
          storeId,
          item.quantity,
          sagaId
        );
      }

      logger.info("Stock committed permanently", {
        event: "stock_committed",
        orderId,
        sagaId,
      });
    } catch (error) {
      logger.error("Failed to commit stock - compensation needed!", {
        orderId,
        sagaId,
        error,
      });
      // Critical alert
    }
  },

  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, items, storeId } = data;

    const idempotencyKey = `release-${sagaId || orderId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) return;

    try {
      for (const item of items) {
        await inventoryService.releaseStock(
          item.productId,
          storeId,
          item.quantity,
          sagaId
        );
      }

      logger.info("Stock released due to payment failure", {
        event: "stock_released_payment_failed",
        orderId,
        sagaId,
      });
    } catch (error) {
      logger.error("Failed to release stock on payment failure", {
        error,
        orderId,
      });
    }
  },
};
