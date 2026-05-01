import Store, { IStore } from "../models/Store";
import { IStoreRepository } from "./IStoreRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import {
  measureDatabaseQuery,
  trackCacheHit,
  trackCacheMiss,
  trackError,
} from "../utils/metrics";
import { AppError } from "../utils/AppError";

export class StoreRepository implements IStoreRepository {
  private readonly CACHE_TTL = 3600;
  private readonly CACHE_PREFIX = "store";

  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}:id:${id}`;
  }

  private getSubdomainCacheKey(subdomain: string): string {
    return `${this.CACHE_PREFIX}:subdomain:${subdomain}`;
  }

  private getCustomDomainCacheKey(domain: string): string {
    return `${this.CACHE_PREFIX}:domain:${domain}`;
  }

  private getSearchCacheKey(
    query: FilterQuery<IStore>,
    skip: number,
    limit: number
  ): string {
    return `${this.CACHE_PREFIX}:search:${JSON.stringify({ query, skip, limit })}`;
  }

  private async invalidateSearchCaches(): Promise<void> {
    try {
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}:search:*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.debug("Store search caches invalidated", { count: keys.length });
      }
    } catch (err) {
      logger.warn("Failed to invalidate search caches", {
        error: err instanceof Error ? err.message : String(err),
        eventType: "cache_invalidation_failed",
      });
    }
  }

  async createStore(
    data: Partial<IStore>,
    session?: mongoose.ClientSession
  ): Promise<IStore> {
    try {
      const [store] = await Store.create([data], { session });

      logger.info("Store document created", {
        storeId: store._id.toString(),
        subdomain: store.subdomain,
        ownerId: store.ownerId.toString(),
        eventType: "store.created",
      });

      await this.invalidateSearchCaches();
      return store;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Failed to create store document", {
        error: message,
        eventType: "store.create.failed",
        subdomain: data.subdomain,
        ownerId: data.ownerId?.toString(),
      });
      trackError("store_create_failed", "createStore", "high");
      throw err instanceof AppError ? err : AppError.internal(message);
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
        trackCacheHit("findAllStore");
        logger.debug("Store list cache hit", {
          cacheKey,
          eventType: "cache.hit",
        });
        return JSON.parse(cached) as IStore[];
      }
    } catch (err) {
      trackError("cache_read_failed", "findAllStore", "low");
      logger.warn("Cache read failed, falling back to DB", {
        error: err instanceof Error ? err.message : String(err),
        eventType: "cache.read.failed",
      });
    }

    trackCacheMiss("findAllStore");

    const stores = await measureDatabaseQuery(
      "find_all_stores",
      () =>
        Store.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
      "stores"
    );

    try {
      await redisClient.set(cacheKey, JSON.stringify(stores), "EX", this.CACHE_TTL);
    } catch (err) {
      logger.warn("Cache write failed", {
        error: err instanceof Error ? err.message : String(err),
        eventType: "cache.write.failed",
      });
    }

    logger.debug("Stores fetched from DB", {
      count: stores.length,
      eventType: "store.list.fetched",
    });

    return stores;
  }

  async countStores(query: FilterQuery<IStore>): Promise<number> {
    return measureDatabaseQuery(
      "count_stores",
      () => Store.countDocuments(query).exec(),
      "stores"
    );
  }

  async findStoreById(id: string): Promise<IStore | null> {
    const cacheKey = this.getCacheKey(id);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        trackCacheHit("findStoreById");
        logger.debug("Store cache hit", {
          storeId: id,
          eventType: "cache.hit",
        });
        return JSON.parse(cached) as IStore;
      }
    } catch (err) {
      trackError("cache_read_failed", "findStoreById", "low");
      logger.warn("Cache read failed", {
        error: err instanceof Error ? err.message : String(err),
        storeId: id,
        eventType: "cache.read.failed",
      });
    }

    trackCacheMiss("findStoreById");

    const store = await measureDatabaseQuery(
      "find_store_by_id",
      () => Store.findById(id).lean().exec(),
      "stores"
    );

    if (store) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(store), "EX", this.CACHE_TTL);
      } catch (err) {
        logger.warn("Cache write failed", {
          error: err instanceof Error ? err.message : String(err),
          storeId: id,
        });
      }

      logger.debug("Store fetched from DB", {
        storeId: id,
        eventType: "store.fetched",
      });
    }

    return store;
  }

  async findBySubdomain(subdomain: string): Promise<IStore | null> {
    const cacheKey = this.getSubdomainCacheKey(subdomain);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        trackCacheHit("findBySubdomain");
        logger.debug("Subdomain cache hit", {
          subdomain,
          eventType: "cache.hit",
        });
        return JSON.parse(cached) as IStore;
      }
    } catch (err) {
      trackError("cache_read_failed", "findBySubdomain", "low");
      logger.warn("Subdomain cache read failed", {
        error: err instanceof Error ? err.message : String(err),
        subdomain,
      });
    }

    trackCacheMiss("findBySubdomain");

    const store = await measureDatabaseQuery(
      "find_by_subdomain",
      () => Store.findOne({ subdomain }).lean().exec(),
      "stores"
    );

    if (store) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(store), "EX", this.CACHE_TTL);
      } catch (err) {
        logger.warn("Subdomain cache write failed", {
          error: err instanceof Error ? err.message : String(err),
          subdomain,
        });
      }
    }

    return store;
  }

  async findByCustomDomain(domain: string): Promise<IStore | null> {
    const cacheKey = this.getCustomDomainCacheKey(domain);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        trackCacheHit("findByCustomDomain");
        return JSON.parse(cached) as IStore;
      }
    } catch (err) {
      trackError("cache_read_failed", "findByCustomDomain", "low");
      logger.warn("Domain cache read failed", {
        error: err instanceof Error ? err.message : String(err),
        domain,
      });
    }

    trackCacheMiss("findByCustomDomain");

    const store = await measureDatabaseQuery(
      "find_by_custom_domain",
      () =>
        Store.findOne({ customDomain: domain, customDomainStatus: "verified" })
          .lean()
          .exec(),
      "stores"
    );

    if (store) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(store), "EX", this.CACHE_TTL);
      } catch (err) {
        logger.warn("Domain cache write failed", {
          error: err instanceof Error ? err.message : String(err),
          domain,
        });
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
      try {
        await Promise.all([
          redisClient.del(this.getCacheKey(id)),
          store.subdomain
            ? redisClient.del(this.getSubdomainCacheKey(store.subdomain))
            : Promise.resolve(),
          store.customDomain
            ? redisClient.del(this.getCustomDomainCacheKey(store.customDomain))
            : Promise.resolve(),
          this.invalidateSearchCaches(),
        ]);
        logger.info("Store updated and cache invalidated", {
          storeId: id,
          eventType: "store.updated",
          updatedFields: Object.keys(data),
        });
      } catch (err) {
        trackError("cache_invalidation_failed", "updateStore", "medium");
        logger.error("Cache invalidation failed after update", {
          error: err instanceof Error ? err.message : String(err),
          storeId: id,
          eventType: "cache.invalidation.failed",
        });
      }
    }

    return store;
  }

  async deleteStoreById(id: string): Promise<void> {
    const store = await Store.findByIdAndDelete(id).exec();

    try {
      const delKeys = [
        this.getCacheKey(id),
        ...(store?.subdomain ? [this.getSubdomainCacheKey(store.subdomain)] : []),
        ...(store?.customDomain ? [this.getCustomDomainCacheKey(store.customDomain)] : []),
      ];
      await Promise.all([
        redisClient.del(...delKeys),
        this.invalidateSearchCaches(),
      ]);
      logger.info("Store deleted and cache cleared", {
        storeId: id,
        eventType: "store.deleted",
      });
    } catch (err) {
      trackError("cache_invalidation_failed", "deleteStoreById", "medium");
      logger.error("Cache invalidation failed after delete", {
        error: err instanceof Error ? err.message : String(err),
        storeId: id,
        eventType: "cache.invalidation.failed",
      });
    }
  }
}