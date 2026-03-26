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
  ORDER_STOCK_COMMITTED_TOPIC,
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

    const requestId = idempotencyId || `${ownerId}-${productId}`;
    const idempKey = `inventory-onboard-${requestId}`;
    const isLocked = await redisClient.setnx(idempKey, "locked");
    if (!isLocked) {
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
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Inventory creation failed (attempt ${attempt + 1})`, {
          ownerId,
          error: msg,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for inventory onboarding", {
            ownerId,
            productId,
          });
          return;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ORDER_CHECKOUT_STARTED_TOPIC]: async (data: any) => {
    const { orderId, storeId, items, sagaId, userId } = data;

    const idempotencyKey = `reserve-${sagaId || orderId}`;
    const locked = await redisClient.setnx(idempotencyKey, "1");
    if (!locked) {
      logger.info("Duplicate reservation attempt ignored", {
        orderId,
        sagaId,
      });
      return;
    }
    await redisClient.expire(idempotencyKey, 90);

    const reservedItems: Array<{ productId: string; quantity: number }> = [];
    const BATCH_TIMEOUT = 25000;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Batch reservation timeout")), BATCH_TIMEOUT)
    );

    try {
      await Promise.race([
        (async () => {
          for (const item of items) {
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
              try {
                const itemTimeoutPromise = new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error(`Reservation timeout for product ${item.productId}`)),
                    5000
                  )
                );
                await Promise.race([
                  inventoryService.reserveStock(
                    item.productId,
                    storeId,
                    item.quantity,
                    `${sagaId}-${item.productId}`
                  ),
                  itemTimeoutPromise,
                ]);
                reservedItems.push({ productId: item.productId, quantity: item.quantity });
                logger.debug("Item reserved successfully", {
                  productId: item.productId,
                  quantity: item.quantity,
                  sagaId,
                });
                break;
              } catch (itemError: any) {
                if (attempt === MAX_RETRIES - 1) {
                  logger.error("Item reservation failed after all retries, rolling back", {
                    failedProduct: item.productId,
                    error: itemError.message,
                    reservedCount: reservedItems.length,
                    sagaId,
                  });

                  const failedItems = items
                    .filter((i: any) => !reservedItems.some((r) => r.productId === i.productId))
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
                    } catch (rollbackError) {
                      logger.error("CRITICAL: Rollback failed for item", {
                        productId: reserved.productId,
                        rollbackError,
                      });
                    }
                  }

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
                  } catch (emitErr) {
                    logger.error("Failed to emit reservation failed event", { emitErr });
                  }
                  return;
                }
                const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
                await new Promise((r) => setTimeout(r, delay));
              }
            }
          }

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
      logger.error("Batch reservation timeout, rolling back", {
        error: batchError.message,
        reservedCount: reservedItems.length,
        sagaId,
      });

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

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        for (const item of items) {
          await inventoryService.commitStock(
            item.productId,
            storeId,
            item.quantity,
            `${sagaId}-${item.productId}`
          );
        }

        // Emiting stock committed event
        await sendInventoryMessage(ORDER_STOCK_COMMITTED_TOPIC, {
          orderId,
          sagaId,
          storeId,
          items,
          committedAt: new Date().toISOString(),
        });

        logger.info("Stock committed and event emitted", {
          event: "stock_committed",
          orderId,
          sagaId,
        });
        return;
      } catch (error: any) {
        logger.error(`Stock commit failed (attempt ${attempt + 1})`, {
          orderId,
          sagaId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for stock commit", {
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

  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, sagaId, items, storeId } = data;

    const idempotencyKey = `release-${sagaId || orderId}`;
    if (!(await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate release ignored", { orderId });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
        return;
      } catch (error: any) {
        logger.error(`Stock release failed (attempt ${attempt + 1})`, {
          orderId,
          sagaId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for stock release", {
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
};