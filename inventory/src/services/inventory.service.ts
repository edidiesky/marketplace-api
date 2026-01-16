import mongoose, { FilterQuery, Types } from "mongoose";
import Inventory, { IInventory } from "../models/Inventory";
import { withTransaction } from "../utils/connectDB";
import { IInventoryRepository } from "../repository/IInventoryRepository";
import { InventoryRepository } from "../repository/InventoryRepository";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import redisClient from "../config/redis";
import logger from "../utils/logger";
export class InventoryService {
  private InventoryRepo: IInventoryRepository;
  private readonly CACHE_PREFIX = "inv:";
  private readonly LOCK_TTL = 10;
  constructor() {
    this.InventoryRepo = new InventoryRepository();
  }

  private getCacheKey(productId: string, storeId: string): string {
    return `${this.CACHE_PREFIX}${storeId}:${productId}`;
  }

  private getLockKey(productId: string, storeId: string): string {
    return `lock:inv:${storeId}:${productId}`;
  }

  /**
   * Safely reserve stock using Redis distributed lock + MongoDB atomic update
   */
  async reserveStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string
  ): Promise<IInventory> {
    if (quantity <= 0) throw new Error("Quantity must be positive");

    const lockKey = this.getLockKey(productId, storeId);
    const lockValue = `${sagaId}-${Date.now()}-${Math.random()}`;
    let lockAcquired = false;
    try {
      const acquired = await redisClient.set(
        lockKey,
        lockValue,
        "EX",
        this.LOCK_TTL,
        "NX"
      );

      if (!acquired) {
        logger.info(
          "Stock reservation contention - lock held by another instance",
          {
            productId,
            storeId,
            sagaId,
          }
        );
        throw new Error(
          "The stock has already being acquired by another client. Please kindly try again after 4 minutes from now."
        );
      }

      lockAcquired = true;

      return await withTransaction(async (session) => {
        const inventory = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityAvailable: { $gte: quantity },
          },
          {
            $inc: {
              quantityAvailable: -quantity,
              quantityReserved: +quantity,
            },
          },
          { new: true, session }
        );

        if (!inventory) {
          logger.error("No sufficient inventory stock:", {
            event: "inventory_stock_insufficient",
            storeId,
            productId,
          });
          throw new Error("No sufficient inventory stock");
        }

        // invalidating cache
        try {
          await redisClient.del(this.getCacheKey(productId, storeId));
          logger.debug("Cache invalidated after reservation", {
            productId,
            storeId,
          });
        } catch (err) {
          logger.warn("Failed to invalidate cache after reservation", {
            message:
              err instanceof Error
                ? err.message
                : "an unknow error occurred during reservation",
            stack:
              err instanceof Error
                ? err.stack
                : "an unknow error occurred during reservation",
          });
        }

        logger.info("Stock successfully reserved", {
          event: "inventory_stock_reserved_succesfully",
          productId,
          storeId,
          quantity,
          sagaId,
          remainingAvailable: inventory.quantityAvailable,
        });

        return inventory;
      });
    } finally {
      if (lockAcquired) {
        try {
          const releaseScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redisClient.eval(releaseScript, 1, lockKey, lockValue);
        } catch (releaseErr) {
          logger.warn("Failed to release Redis lock - will expire naturally", {
            lockKey,
            productId,
            storeId,
            error: releaseErr,
          });
        }
      }
    }
  }

  /**
   * Permanently commit reserved stock after successful payment
   */
  async commitStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string
  ): Promise<IInventory> {
    if (quantity <= 0) {
      logger.error("Quantity was not a positive value:", {
        quantity,
        sagaId,
        storeId,
        productId,
      });
      throw new Error("Quantity must be positive");
    }

    const lockKey = this.getLockKey(productId, storeId);
    const lockValue = `${sagaId}-${Date.now()}-${Math.random()}`;
    let lockAcquired = false;

    try {
      const acquired = await redisClient.set(
        lockKey,
        lockValue,
        "EX",
        this.LOCK_TTL,
        "NX"
      );

      if (!acquired) {
        logger.info("Stock commit contention - lock held by another instance", {
          productId,
          storeId,
          sagaId,
        });
        throw new Error(
          "The stock has already being acquired by another client. Please kindly try again after 4 minutes from now."
        );
      }

      lockAcquired = true;

      return await withTransaction(async (session) => {
        const inventory = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityReserved: { $gte: quantity },
          },
          {
            $inc: {
              quantityOnHand: -quantity,
              quantityReserved: -quantity,
            },
          },
          { new: true, session }
        );

        if (!inventory) {
          logger.info(
            "Stock commit failed due to the reservation does not exists!",
            {
              productId,
              storeId,
              sagaId,
            }
          );
          throw new Error(
            "Stock commit failed due to the reservation does not exists."
          );
        }

        // Invalidate cache
        try {
          await redisClient.del(this.getCacheKey(productId, storeId));
        } catch (err) {
          logger.warn("Failed to invalidate cache after reservation", {
            message:
              err instanceof Error
                ? err.message
                : "an unknow error occurred during reservation",
            stack:
              err instanceof Error
                ? err.stack
                : "an unknow error occurred during reservation",
          });
        }

        logger.info("Stock permanently committed", {
          productId,
          storeId,
          quantity,
          sagaId,
          remainingOnHand: inventory.quantityOnHand,
        });

        return inventory;
      });
    } finally {
      if (lockAcquired) {
        try {
          const releaseScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redisClient.eval(releaseScript, 1, lockKey, lockValue);
        } catch (releaseErr) {
          logger.warn("Failed to release commit lock", { lockKey, releaseErr });
        }
      }
    }
  }

  
  async releaseStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string
  ): Promise<IInventory | null> {
    const lockKey = this.getLockKey(productId, storeId);
    const lockValue = `${sagaId}-release-${Date.now()}`;
    let lockAcquired = false;

    try {
      const acquired = await redisClient.set(
        lockKey,
        lockValue,
        "EX",
        this.LOCK_TTL,
        "NX"
      );

      if (!acquired) {
        return null; // Another instance is working on it
      }

      lockAcquired = true;

      return await withTransaction(async (session) => {
        const inventory = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
          },
          {
            $inc: {
              quantityAvailable: +quantity,
              quantityReserved: -quantity, // we'll clamp below if needed
            },
          },
          { new: true, session }
        );

        if (inventory) {
          // Optional: clamp reserved to >= 0
          if (inventory.quantityReserved < 0) {
            inventory.quantityReserved = 0;
            await inventory.save({ session });
          }

          try {
            await redisClient.del(this.getCacheKey(productId, storeId));
          } catch {}
        }

        return inventory; // can be null if not found
      });
    } finally {
      if (lockAcquired) {
        try {
          const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
          await redisClient.eval(script, 1, lockKey, lockValue);
        } catch (releaseErr) {
          logger.warn("Failed to release lock in releaseStock", {
            lockKey,
            releaseErr,
          });
        }
      }
    }
  }

  /**
   * @description Create Inventory method
   * @param userId
   * @param body
   * @returns
   */
  async createInventory(
    userId: string,
    body: Partial<IInventory>
  ): Promise<IInventory> {
    return withTransaction(async (session) => {
      const inventoryData = {
        ...body,
        ownerId: new Types.ObjectId(userId),
      };

      const Inventory = await this.InventoryRepo.createInventory(
        inventoryData,
        session
      );
      return Inventory;
    });
  }

  /**
   * @description Get all Inventory method
   * @param query
   * @param skip
   * @param limit
   * @returns
   */
  async getAllInventorys(
    query: FilterQuery<IInventory>,
    skip: number,
    limit: number
  ): Promise<{
    data: {
      inventorys: IInventory[] | null;
      totalCount: number;
      totalPages: number;
    };
    success: boolean;
    statusCode: number;
  }> {
    const [inventorys, totalCount] = await Promise.all([
      this.InventoryRepo.getStoreInventory(query, skip, limit),
      Inventory.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: {
        inventorys,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  /**
   * @description Get single Inventory method
   * @param query id
   * @returns
   */
  async getInventoryById(id: string): Promise<IInventory | null> {
    return this.InventoryRepo.getSingleInventory(id);
  }

  /**
   * @description Get inventory by productId and storeId
   * @param productId 
   * @param storeId 
   * @returns 
   */
  async getInventoryByProduct(productId: string, storeId: string): Promise<IInventory | null> {
    return this.InventoryRepo.getInventoryByProduct(productId, storeId);
  }

  /**
   * @description update single Inventory method
   * @param id
   * @param body
   * @returns
   */
  async updateInventory(
    id: string,
    body: Partial<IInventory>
  ): Promise<IInventory | null> {
    return this.InventoryRepo.updateInventory(body, id);
  }

  async deleteInventory(id: string): Promise<void> {
    return this.InventoryRepo.deleteInventory(id);
  }
}

export const inventoryService = new InventoryService();
