import redisClient from "../config/redis";
import Inventory, { IInventory } from "../models/Inventory";
import { IInventoryRepository } from "./IInventoryRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery } from "mongoose";
import { measureDatabaseQuery } from "../utils/metrics";

export class InventoryRepository implements IInventoryRepository {
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "inventory:";

  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}:${id}`;
  }

  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    return `${this.CACHE_PREFIX}:search:${JSON.stringify({
      query,
      skip,
      limit,
    })}`;
  }

  private async invalidateSearchCaches(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}:search:*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info("Invalidated inventory search caches", {
          count: keys.length,
        });
      }
    } catch (error) {
      logger.error("Failed to invalidate search caches", { error });
    }
  }

  async getStoreInventory(
    query: FilterQuery<IInventory>,
    skip: number,
    limit: number
  ): Promise<IInventory[] | null> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Inventory search cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }
    

    const inventory = await measureDatabaseQuery("fetch_all_inventory", () =>
      Inventory.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    );

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(inventory),
        "EX",
        this.CACHE_TTL
      );
    } catch (error) {
      logger.warn("Cache write failed", { error, cacheKey });
    }

    return inventory;
  }

  async getInventoryByProduct(productId: string, storeId: string): Promise<IInventory | null> {
    const inventory = await measureDatabaseQuery("fetch_inventory_by_product", () =>
      Inventory.findOne({ productId : productId, storeId: storeId }).lean().exec()
    );
    logger.info("Fetched inventory by productId and storeId", { productId, storeId });
    return inventory;
  }

  /**
   * @description Get single Inventory method
   * @param inventoryId
   * @returns
   */
  async getSingleInventory(inventoryId: string): Promise<IInventory | null> {
    const cacheKey = this.getCacheKey(inventoryId);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Inventory cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const inventory = await measureDatabaseQuery("fetch_single_inventory", () =>
      Inventory.findById(inventoryId).lean().exec()
    );

    if (inventory) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(inventory),
          "EX",
          this.CACHE_TTL
        );
      } catch (error) {
        logger.warn("Cache write failed", { error, cacheKey });
      }
    }

    return inventory;
  }

  /**
   * @description Update Inventory method
   * @param data
   * @param inventoryId
   * @returns
   */
  async updateInventory(
    data: Partial<IInventory>,
    inventoryId: string
  ): Promise<IInventory | null> {
    const inventory = await Inventory.findByIdAndUpdate(
      inventoryId,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();

    if (inventory) {
      const cacheKey = this.getCacheKey(inventoryId);

      try {
        await Promise.all([
          redisClient.del(cacheKey),
          this.invalidateSearchCaches(),
        ]);

        logger.info("Inventory cache invalidated", { inventoryId });
      } catch (error) {
        logger.error("Cache invalidation failed", { error, inventoryId });
      }
    }

    return inventory;
  }
  /**
   * @description Delete Inventory method
   * @param data
   */
  async deleteInventory(data: string): Promise<void> {
    await Inventory.findByIdAndDelete(data).exec();

    const cacheKey = this.getCacheKey(data);

    try {
      await Promise.all([
        redisClient.del(cacheKey),
        this.invalidateSearchCaches(),
      ]);

      logger.info("Inventory deleted and cache invalidated", {
        inventoryId: data,
      });
    } catch (error) {
      logger.error("Cache invalidation failed after deletion", {
        error,
        inventoryId: data,
      });
    }
  }
  /**
   * @description Create Inventory method
   * @param data
   * @param session
   * @returns
   */
  async createInventory(
    data: Partial<IInventory>,
    session?: mongoose.ClientSession
  ): Promise<IInventory> {
    try {
      const [inventory] = await Inventory.create([data], { session });

      logger.info("Inventory created successfully", {
        storeId: inventory._id,
      });

      await this.invalidateSearchCaches();

      return inventory;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to create inventory", {
        error: errorMessage,
        data: { name: data.productId },
      });

      throw error instanceof Error
        ? error
        : new Error("Failed to create inventory");
    }
  }
}
