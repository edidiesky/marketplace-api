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
          // await sendInventoryMessage(INVENTORY_CREATION_FAILED_TOPIC, data);
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
    const locked = await redisClient.setnx(idempotencyKey, "1");
    if (!locked) {
      logger.info("Duplicate reservation attempt ignored", {
        event: "duplicate_order",
        orderId,
        sagaId,
      });
      return;
    }

    await redisClient.expire(idempotencyKey, 90);

    const reservedItems: Array<{
      productId: string;
      quantity: number;
    }> = [];

    const BATCH_TIMEOUT = 25000; 
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Batch reservation timeout")),
        BATCH_TIMEOUT
      );
    });

    try {
      await Promise.race([
        (async () => {
          for (const item of items) {
            try {
              const ITEM_TIMEOUT = 5000;
              const itemTimeoutPromise = new Promise((_, reject) => {
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Reservation timeout for product ${item.productId}`
                      )
                    ),
                  ITEM_TIMEOUT
                );
              });

              await Promise.race([
                inventoryService.reserveStock(
                  item.productId,
                  storeId,
                  item.quantity,
                  `${sagaId}-${item.productId}`
                ),
                itemTimeoutPromise,
              ]);

              reservedItems.push({
                productId: item.productId,
                quantity: item.quantity,
              });

              logger.debug("Item reserved successfully", {
                productId: item.productId,
                quantity: item.quantity,
                sagaId,
              });
            } catch (itemError: any) {
              logger.error("Item reservation failed, starting rollback", {
                failedProduct: item.productId,
                error: itemError.message,
                reservedCount: reservedItems.length,
                sagaId,
              });

              const failedItems = items
                .filter(
                  (i: any) =>
                    !reservedItems.some((r) => r.productId === i.productId)
                )
                .map((i: any) => ({
                  productId: i.productId,
                  productTitle: i.productTitle,
                  reason: itemError.message.includes("INSUFFICIENT_STOCK")
                    ? "Out of stock"
                    : "Reservation failed",
                }));
              for (const reserved of reservedItems) {
                try {
                  await inventoryService.releaseStock(
                    reserved.productId,
                    storeId,
                    reserved.quantity,
                    `${sagaId}-rollback-${reserved.productId}`
                  );
                  logger.info("Rolled back reservation", {
                    productId: reserved.productId,
                    quantity: reserved.quantity,
                  });
                } catch (rollbackError) {
                  logger.error("CRITICAL: Rollback failed for item", {
                    productId: reserved.productId,
                    rollbackError,
                  });
                }
              }

              // Send failure event
              try {
                await sendInventoryMessage(ORDER_RESERVATION_FAILED_TOPIC, {
                  orderId,
                  sagaId,
                  userId,
                  storeId,
                  reason: itemError.message,
                  failedItems,
                  failedAt: new Date().toISOString(),
                });

                logger.info("Reservation failure event sent", {
                  orderId,
                  sagaId,
                  failedItemCount: failedItems.length,
                });
              } catch (emitErr) {
                logger.error("Failed to emit reservation failed event", {
                  emitErr,
                });
              }

              return; 
            }
          }

          // All items reserved successfully
          logger.info("All items reserved successfully", {
            event: "reservation_success",
            orderId,
            sagaId,
            itemCount: items.length,
          });
        })(),
        timeoutPromise,
      ]);
    } catch (batchError: any) {
      // Handle batch timeout
      logger.error("Batch reservation timeout, rolling back", {
        batchError: batchError.message,
        reservedCount: reservedItems.length,
        sagaId,
      });

      // Rollback all reserved items
      for (const reserved of reservedItems) {
        try {
          await inventoryService.releaseStock(
            reserved.productId,
            storeId,
            reserved.quantity,
            `${sagaId}-timeout-rollback-${reserved.productId}`
          );
        } catch (rollbackError) {
          logger.error("CRITICAL: Timeout rollback failed", {
            productId: reserved.productId,
            rollbackError,
          });
        }
      }

      // Send failure event
      try {
        await sendInventoryMessage(ORDER_RESERVATION_FAILED_TOPIC, {
          orderId,
          sagaId,
          userId,
          storeId,
          reason: "Reservation timeout",
          failedItems: [],
          failedAt: new Date().toISOString(),
        });
      } catch (emitErr) {
        logger.error("Failed to emit timeout failure event", { emitErr });
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
          `${sagaId}-${item.productId}`
        );
      }

      logger.info("Stock committed permanently", {
        event: "stock_committed",
        orderId,
        sagaId,
      });
    } catch (error: any) {
      logger.error("Failed to commit stock - compensation needed!", {
        orderId,
        sagaId,
        error: error.message,
      });
    }
  },

  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, items, storeId } = data;

    const idempotencyKey = `release-${sagaId || orderId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX")))
      return;

    try {
      for (const item of items) {
        await inventoryService.releaseStock(
          item.productId,
          storeId,
          item.quantity,
          `${sagaId}-${item.productId}`
        );
      }

      logger.info("Stock released due to payment failure", {
        event: "stock_released_payment_failed",
        orderId,
        sagaId,
      });
    } catch (error: any) {
      logger.error("Failed to release stock on payment failure", {
        error: error.message,
        orderId,
      });
    }
  },
};