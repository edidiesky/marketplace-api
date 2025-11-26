import Store, { IStore } from "../models/Store";
import { IStoreRepository } from "./IStoreRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import { measureDatabaseQuery } from "../utils/metrics";

export class StoreRepository implements IStoreRepository {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = "store";

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
        logger.info("Invalidated store search caches", { count: keys.length });
      }
    } catch (error) {
      logger.error("Failed to invalidate search caches", { error });
    }
  }

  
  async createStore(
    data: Partial<IStore>,
    session?: mongoose.ClientSession
  ): Promise<IStore> {
    try {
      const [store] = await Store.create([data], { session });

      logger.info("Store created successfully", {
        storeId: store._id,
        subdomain: store.subdomain,
      });

      // Invalidate search caches as new store affects list queries
      await this.invalidateSearchCaches();

      return store;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to create store", {
        error: errorMessage,
        data: { name: data.name, subdomain: data.subdomain },
      });

      throw error instanceof Error
        ? error
        : new Error("Failed to create store");
    }
  }

  async findAllStore(
    query: FilterQuery<IStore>,
    skip: number,
    limit: number
  ): Promise<IStore[]> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Store search cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const stores = await measureDatabaseQuery("fetch_all_stores", () =>
      Store.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    );

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(stores),
        "EX",
        this.CACHE_TTL
      );
    } catch (error) {
      logger.warn("Cache write failed", { error, cacheKey });
    }

    return stores;
  }

  async countStores(query: FilterQuery<IStore>): Promise<number> {
    return measureDatabaseQuery("count_stores", () =>
      Store.countDocuments(query).exec()
    );
  }

  async findStoreById(id: string): Promise<IStore | null> {
    const cacheKey = this.getCacheKey(id);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Store cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const store = await measureDatabaseQuery("fetch_single_store", () =>
      Store.findById(id).lean().exec()
    );

    if (store) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(store),
          "EX",
          this.CACHE_TTL
        );
      } catch (error) {
        logger.warn("Cache write failed", { error, cacheKey });
      }
    }

    return store;
  }

  async updateStore(id: string, data: Partial<IStore>): Promise<IStore | null> {
    const store = await Store.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();

    if (store) {
      const cacheKey = this.getCacheKey(id);

      try {
        await Promise.all([
          redisClient.del(cacheKey),
          this.invalidateSearchCaches(),
        ]);

        logger.info("Store cache invalidated", { storeId: id });
      } catch (error) {
        logger.error("Cache invalidation failed", { error, storeId: id });
      }
    }

    return store;
  }

  async deleteStoreById(id: string): Promise<void> {
    await Store.findByIdAndDelete(id).exec();

    const cacheKey = this.getCacheKey(id);

    try {
      await Promise.all([
        redisClient.del(cacheKey),
        this.invalidateSearchCaches(),
      ]);

      logger.info("Store deleted and cache invalidated", { storeId: id });
    } catch (error) {
      logger.error("Cache invalidation failed after deletion", {
        error,
        storeId: id,
      });
    }
  }
}
